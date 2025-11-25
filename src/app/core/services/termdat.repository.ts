import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Collection, LanguageCode, SearchFilters, TermdatEntry } from '../models/termdat';
import {
  CollectionResponse,
  SearchResponse,
  mapCollection,
  mapSearchResponse,
  sortByName,
} from '../mappers/termdat.mapper';
import { TermdatApiService } from './termdat.api';

@Injectable({ providedIn: 'root' })
export class TermdatRepository {
  private readonly api = inject(TermdatApiService);
  private searchRunId = 0;
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
    () => this.api.buildCollectionsRequest(this.sourceLanguage()),
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

  private currentFilters(): SearchFilters {
    return {
      sourceLanguage: this.sourceLanguage(),
      targetLanguages: this.targetLanguages(),
      collections: this.collectionsFilter(),
    };
  }

  private buildSearchUrl(pageIndex: number = 1): string | undefined {
    if (!this.collectionsResource.hasValue()) {
      return undefined;
    }
    return this.api.buildSearchUrl(this.currentFilters(), pageIndex, this.api.pageSize);
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
    return this.entries().slice(0, cappedLimit);
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
    this.totalEntryCount.set(filteredEntries.length);
    this.paginationPromise = undefined;
    const pageEntryCount = payload.searchEntries?.length ?? 0;
    if (!collectionChanged && filteredEntries.length && pageEntryCount >= this.api.pageSize) {
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
    const url = this.buildSearchUrl(pageIndex);
    if (!url) {
      return [];
    }
    return this.api.fetchSearchPage(this.currentFilters(), pageIndex, this.api.pageSize);
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
        pageEntries.length < this.api.pageSize
      ) {
        break;
      }
      page += 1;
    }

    if (runId === this.searchRunId) {
      this.searchResource.set(aggregated);
      this.totalEntryCount.set(aggregated.length);
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
        continue;
      }
      filtered.push(entry);
    }

    return { filtered, primaryCollectionId: resolvedCollectionId, collectionChanged };
  }

}
