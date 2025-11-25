import { Collection, LanguageCode, TermdatEntry, TermdatLanguageDetail } from '../models/termdat';

export const LANGUAGE_ID_BY_CODE: Partial<Record<LanguageCode, number>> = {
  DE: 2,
  EN: 3,
  FR: 6,
  IT: 7,
};

export const LANGUAGE_CODE_BY_ID: Partial<Record<number, LanguageCode>> = {
  2: 'DE',
  3: 'EN',
  6: 'FR',
  7: 'IT',
};

export interface CollectionResponse {
  id?: number;
  code?: string | null;
  name?: string | null;
  text?: string | null;
}

export interface EntryLanguageDetailResponse {
  id?: number;
  languageIsoCode?: string | null;
  terminus?: string | null;
  name?: string | null;
  phraseology?: string | null;
  abbreviation?: string | null;
  definition?: string | null;
  note?: string | null;
  context?: string | null;
}

export interface EntryDetailResponse {
  id?: number;
  url?: string | null;
  collection?: CollectionResponse;
  languageDetails?: EntryLanguageDetailResponse[];
}

export interface SearchTermResponse {
  languageId?: number;
  sequence?: number;
  terminus?: string;
  name?: string;
  abbreviation?: string;
  phraseology?: string;
  definition?: string;
  note?: string;
  context?: string;
}

export interface SearchEntryResponse {
  id?: number;
  url?: string | null;
  collection?: CollectionResponse;
  terms?: SearchTermResponse[];
}

export interface SearchResponse {
  searchEntries?: SearchEntryResponse[];
}

const normalizeLanguage = (code: string | null | undefined): LanguageCode => {
  return (code ?? 'DE').toUpperCase() as LanguageCode;
};

export const mapCollection = (dto: CollectionResponse): Collection => ({
  id: dto.id ?? 0,
  code: dto.code ?? '',
  name: dto.name ?? dto.text ?? '',
});


const mapLanguageDetail = (dto: EntryLanguageDetailResponse): TermdatLanguageDetail => ({
  id: dto.id ?? 0,
  languageCode: normalizeLanguage(dto.languageIsoCode),
  terminus: dto.terminus ?? undefined,
  name: dto.name ?? undefined,
  phraseology: dto.phraseology ?? undefined,
  abbreviation: dto.abbreviation ?? undefined,
  definition: dto.definition ?? undefined,
  note: dto.note ?? undefined,
  context: dto.context ?? undefined,
  url: undefined,
});

export const mapEntry = (dto: EntryDetailResponse): TermdatEntry => ({
  id: dto.id ?? 0,
  url: dto.url ?? '',
  collection: dto.collection ? mapCollection(dto.collection) : undefined,
  languageDetails: (dto.languageDetails ?? []).map(mapLanguageDetail),
});

export const sortByName = <T extends { name?: string }>(items: T[]): T[] =>
  [...items].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));

const mapSearchTerm = (term: SearchTermResponse): TermdatLanguageDetail | undefined => {
  const languageCode = LANGUAGE_CODE_BY_ID[term.languageId ?? -1];
  if (!languageCode) {
    return undefined;
  }
  return {
    id: term.languageId ?? 0,
    languageCode,
    terminus: term.terminus ?? undefined,
    name: term.name ?? undefined,
    phraseology: term.phraseology ?? undefined,
    abbreviation: term.abbreviation ?? undefined,
    definition: term.definition ?? undefined,
    note: term.note ?? undefined,
    context: term.context ?? undefined,
    url: undefined,
  };
};

const mapSearchEntry = (
  entry: SearchEntryResponse,
): TermdatEntry => {
  const seenLanguages = new Set<number>();
  const languageDetails =
    entry.terms
      ?.filter((term) => {
        const languageId = term.languageId;
        if (languageId === undefined || seenLanguages.has(languageId)) {
          return false;
        }
        seenLanguages.add(languageId);
        return true;
      })
      .map((term) => mapSearchTerm(term))
      .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail)) ?? [];

  return {
    id: entry.id ?? 0,
    url: entry.url ?? '',
    collection: entry.collection ? mapCollection(entry.collection) : undefined,
    languageDetails,
  };
};

export const mapSearchResponse = (
  payload: SearchResponse,
): { entries: TermdatEntry[] } => {
  const entries = (payload.searchEntries ?? []).map((entry) => mapSearchEntry(entry));
  return { entries };
};
