export type LanguageCode =
  | 'DE'
  | 'FR'
  | 'IT'
  | 'EN'
  | 'RM'
  | 'ES'
  | 'PT'
  | 'ZH'
  | 'CS'
  | 'FI'
  | 'NL'
  | 'PL'
  | 'SV'
  | 'DA'
  | 'EL'
  | 'TR'
  | 'HU'
  | 'SK'
  | 'SL'
  | 'HR'
  | 'NO'
  | 'IS'
  | 'LA'
  | 'KR';

export interface Collection {
  id: number;
  code: string;
  name: string;
}


export interface TermdatLanguageDetail {
  id: number;
  languageCode: LanguageCode;
  terminus?: string;
  name?: string;
  phraseology?: string;
  abbreviation?: string;
  definition?: string;
  note?: string;
  context?: string;
  url?: string;
}

export interface TermdatEntry {
  id: number;
  url: string;
  collection?: Collection;
  languageDetails: TermdatLanguageDetail[];
}

export interface SearchFilters {
  sourceLanguage: LanguageCode;
  targetLanguages: LanguageCode[];
  collections: number[];
}
