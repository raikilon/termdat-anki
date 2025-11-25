import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TERMDAT_API_DIRECT_BASE } from '../../termdat.config';
import { LanguageCode, SearchFilters, TermdatEntry } from '../models/termdat';
import { LANGUAGE_ID_BY_CODE, SearchResponse, mapSearchResponse } from '../mappers/termdat.mapper';

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
export class TermdatApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiDirectBase = TERMDAT_API_DIRECT_BASE;

  readonly pageSize = 100;

  buildCollectionsRequest(sourceLanguage: LanguageCode): { url: string; headers: Record<string, string> } {
    return {
      url: `${this.apiDirectBase}/api/Collection`,
      headers: {
        'Accept-Language': sourceLanguage,
      },
    };
  }

  buildSearchUrl(
    filters: SearchFilters,
    pageIndex: number = 1,
    pageSize: number = this.pageSize,
  ): string | undefined {
    const params = this.buildSearchParams(filters, pageIndex, pageSize);
    if (!params) {
      return undefined;
    }
    return `${this.apiDirectBase}/api/Search/Search?${params.toString()}`;
  }

  async fetchSearchPage(
    filters: SearchFilters,
    pageIndex: number,
    pageSize: number = this.pageSize,
  ): Promise<TermdatEntry[]> {
    const url = this.buildSearchUrl(filters, pageIndex, pageSize);
    if (!url) {
      return [];
    }
    const payload = await firstValueFrom(
      this.httpClient.get<SearchResponse>(url, { headers: { accept: 'application/json' } }),
    );
    return mapSearchResponse(payload ?? {}).entries;
  }

  private buildSearchParams(
    filters: SearchFilters,
    pageIndex: number,
    pageSize: number,
  ): URLSearchParams | undefined {
    const selectedCollections = filters.collections;
    const selectedTargets = filters.targetLanguages;
    if (selectedCollections.length === 0 || selectedTargets.length === 0) {
      return undefined;
    }
    const params = new URLSearchParams();
    params.set('pageindex', String(pageIndex));
    params.set('pagesize', String(pageSize));
    const sourceId = LANGUAGE_ID_BY_CODE[filters.sourceLanguage];
    if (sourceId) {
      params.set('sourceLanguageIds', String(sourceId));
    }
    selectedTargets
      .map((code) => LANGUAGE_ID_BY_CODE[code])
      .filter((value): value is number => Number.isFinite(value))
      .forEach((id) => params.append('targetLanguageIds', String(id)));
    selectedCollections
      .filter((id) => Number.isFinite(id))
      .forEach((id) => params.append('collections', String(id)));
    params.set('collectionsPriority', 'true');
    params.set('status', '1');
    params.set('statusPriority', 'true');
    SEARCH_DISABLED_FIELDS.forEach((field) => params.set(field, 'false'));
    return params;
  }
}
