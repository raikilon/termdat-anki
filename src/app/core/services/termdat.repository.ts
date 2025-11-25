import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { TERMDAT_API_DIRECT_BASE } from '../../termdat.config';
import { Collection, LanguageCode, TermdatEntry } from '../models/termdat';
import {
  CollectionResponse,
  LANGUAGE_ID_BY_CODE,
  SearchResponse,
  mapCollection,
  mapSearchResponse,
  sortByName,
} from '../mappers/termdat.mapper';

const SEARCH_DISABLED_FIELDS = [
  'fields.term',
  'fields.name',
  'fields.abbreviation',
  'fields.phraseology',
  'fields.definition',
  'fields.note',
  'fields.context',
  'fields.source',
  'fields.metadata',
  'fields.country',
  'fields.comment',
] as const;

@Injectable({ providedIn: 'root' })
export class TermdatRepository {
  private readonly apiDirectBase = TERMDAT_API_DIRECT_BASE;
  private static readonly SEARCH_PAGE_SIZE = 100;
  private searchRunId = 0;
  private lastSearchRunId = 0;
  private lastEntries: TermdatEntry[] = [];
  private paginationPromise: Promise<void> | undefined;
  private loadingAllData = signal(false);

  readonly sourceLanguage = signal<LanguageCode>('IT');
  readonly targetLanguages = signal<LanguageCode[]>(['DE']);
  readonly collectionsFilter = signal<number[]>([]);
  readonly totalEntryCount = signal<number>(0);
  readonly isLoadingData = computed(
    () => this.loadingAllData() || this.searchResource.isLoading(),
  );

  readonly collectionsResource = httpResource<Collection[]>(
    () => this.buildCollectionsRequest(),
    {
      defaultValue: [],
      parse: (value) => {
        const collections = (Array.isArray(value) ? value : []) as CollectionResponse[];
        return sortByName(collections.map(mapCollection));
      },
    },
  );
  readonly searchResource = httpResource<TermdatEntry[]>(
    () => this.buildSearchUrl(),
    {
      defaultValue: [],
      parse: (value) => this.parseSearch(value),
    },
  );

  readonly collections = computed(() => this.collectionsResource.value() ?? []);
  readonly entries = computed(() => this.searchResource.value() ?? []);

  constructor() {
    this.collectionsResource.reload();
  }

  private buildSearchUrl(
    pageIndex: number = 1,
    pageSize: number = TermdatRepository.SEARCH_PAGE_SIZE,
  ): string | undefined {
    const params = this.buildSearchParams(pageIndex, pageSize);
    if (!params) {
      return undefined;
    }
    const query = params.toString();
    return `${this.apiDirectBase}/api/Search/Search?${query}`;
  }

  async fetchAllEntries(limit: number): Promise<TermdatEntry[]> {
    if (
      this.collectionsFilter().length === 0 ||
      this.targetLanguages().length === 0 ||
      !this.collectionsResource.hasValue()
    ) {
      return [];
    }
    const cappedLimit = Math.max(0, limit);
    if (!cappedLimit) {
      return [];
    }
    if (this.paginationPromise) {
      await this.paginationPromise;
    }
    if (this.lastSearchRunId !== this.searchRunId) {
      return [];
    }
    return this.lastEntries.slice(0, cappedLimit);
  }

  private buildCollectionsRequest(): { url: string; headers: Record<string, string> } {
    return {
      url: `${this.apiDirectBase}/api/Collection`,
      headers: {
        'Accept-Language': this.sourceLanguage(),
      },
    };
  }

  private buildSearchParams(pageIndex: number, pageSize: number): URLSearchParams | undefined {
    const selectedCollections = this.collectionsFilter();
    const selectedTargets = this.targetLanguages();
    if (
      !this.collectionsResource.hasValue() ||
      selectedCollections.length === 0 ||
      selectedTargets.length === 0
    ) {
      return undefined;
    }
    const params = new URLSearchParams();
    params.set('pageindex', String(pageIndex));
    params.set('pagesize', String(pageSize));
    const sourceId = LANGUAGE_ID_BY_CODE[this.sourceLanguage()];
    if (sourceId) {
      params.set('sourceLanguageIds', String(sourceId));
    }
    this.targetLanguages()
      .map((code) => LANGUAGE_ID_BY_CODE[code])
      .filter((value): value is number => Number.isFinite(value))
      .forEach((id) => params.append('targetLanguageIds', String(id)));
    this.collectionsFilter()
      .filter((id) => Number.isFinite(id))
      .forEach((id) => params.append('collections', String(id)));
    params.set('collectionsPriority', 'true');
    params.set('status', '1');
    params.set('statusPriority', 'true');
    SEARCH_DISABLED_FIELDS.forEach((field) => params.set(field, 'false'));
    return params;
  }

  private parseSearch(value: unknown): TermdatEntry[] {
    const payload = (value ?? {}) as SearchResponse;
    const entries = mapSearchResponse(payload).entries;
    const allowedCollections = new Set(this.collectionsFilter());
    const {
      filtered: filteredEntries,
      collectionChanged,
      primaryCollectionId,
    } = this.filterEntriesByCollection(entries, allowedCollections);
    const runId = ++this.searchRunId;
    this.loadingAllData.set(false);
    this.lastEntries = filteredEntries;
    this.lastSearchRunId = runId;
    this.totalEntryCount.set(filteredEntries.length);
    this.paginationPromise = undefined;
    const pageEntryCount = payload.searchEntries?.length ?? 0;
    if (!collectionChanged && filteredEntries.length && pageEntryCount >= TermdatRepository.SEARCH_PAGE_SIZE) {
      this.loadingAllData.set(true);
      this.paginationPromise = this.paginateSearch(
        runId,
        primaryCollectionId,
        2,
        filteredEntries,
        allowedCollections,
      );
    }
    return filteredEntries;
  }

  private async fetchSearchPageEntries(pageIndex: number): Promise<TermdatEntry[]> {
    const url = this.buildSearchUrl(pageIndex, TermdatRepository.SEARCH_PAGE_SIZE);
    if (!url) {
      return [];
    }
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as SearchResponse;
    return mapSearchResponse(payload).entries;
  }

  private async paginateSearch(
    runId: number,
    collectionId: number | undefined,
    startPageIndex: number,
    initialEntries: TermdatEntry[],
    allowedCollections: ReadonlySet<number>,
  ): Promise<void> {
    let page = startPageIndex;
    let resolvedCollectionId = collectionId;
    const aggregated = [...initialEntries];

    while (true) {
      const pageEntries = await this.fetchSearchPageEntries(page);
      if (runId !== this.searchRunId) {
        return;
      }
      if (!pageEntries.length) {
        break;
      }
      const {
        filtered,
        primaryCollectionId,
        collectionChanged,
      } = this.filterEntriesByCollection(pageEntries, allowedCollections, resolvedCollectionId);
      resolvedCollectionId = resolvedCollectionId ?? primaryCollectionId;
      if (filtered.length) {
        aggregated.push(...filtered);
      }
      if (
        collectionChanged ||
        pageEntries.length < TermdatRepository.SEARCH_PAGE_SIZE
      ) {
        break;
      }
      page += 1;
    }

    if (runId === this.searchRunId) {
      this.searchResource.set(aggregated);
      this.totalEntryCount.set(aggregated.length);
      this.lastEntries = aggregated;
      this.lastSearchRunId = runId;
    }
    this.loadingAllData.set(false);
    this.paginationPromise = undefined;
  }

  private filterEntriesByCollection(
    entries: TermdatEntry[],
    allowedCollectionIds: ReadonlySet<number>,
    primaryCollectionId?: number,
  ): {
    filtered: TermdatEntry[];
    primaryCollectionId?: number;
    collectionChanged: boolean;
  } {
    let resolvedCollectionId = primaryCollectionId;
    let collectionChanged = false;
    const filtered: TermdatEntry[] = [];

    for (const entry of entries) {
      const entryCollectionId = entry.collection?.id;
      if (resolvedCollectionId === undefined && entryCollectionId !== undefined && allowedCollectionIds.has(entryCollectionId)) {
        resolvedCollectionId = entryCollectionId;
      }
      if (entryCollectionId !== undefined && !allowedCollectionIds.has(entryCollectionId)) {
        collectionChanged = true;
        break;
      }
      filtered.push(entry);
    }

    return { filtered, primaryCollectionId: resolvedCollectionId, collectionChanged };
  }

}
