import { Injectable } from '@angular/core';
import { DeckRow } from '../models/anki';
import { LanguageCode, TermdatEntry, TermdatLanguageDetail } from '../models/termdat';

@Injectable({ providedIn: 'root' })
export class DeckMapperService {
  buildRows(entries: TermdatEntry[], source: LanguageCode, targets: LanguageCode[]): DeckRow[] {
    if (!entries?.length) {
      return [];
    }

    const normalizedTargets = this.normalizeTargets(source, targets);

    return entries
      .map((entry) => {
        const sourceDetail = this.pickLanguage(entry, source);

        const front = this.summarize(sourceDetail);
        const definition = this.extractDefinition(sourceDetail);
        const url = this.cleanInline(entry.url ?? '');

        const backLines = normalizedTargets
          .map((code) => {
            const detail = this.pickLanguage(entry, code);
            const text = this.summarize(detail);
            return text ? `${code}: ${text}` : '';
          })
          .filter(Boolean);

        const back = this.joinLines(backLines) || '—';

        return { front, back, definition, url };
      })
      .filter((row) => !!row.front || !!row.back);
  }

  buildFileName(source: LanguageCode, targets: LanguageCode[]): string {
    const normalizedTargets = this.normalizeTargets(source, targets);

    const targetSegment = normalizedTargets.length
      ? normalizedTargets.map((code) => code.toLowerCase()).join('-')
      : 'deck';

    return `termdat-${source.toLowerCase()}-to-${targetSegment}.tsv`;
  }

  private normalizeTargets(source: LanguageCode, targets: LanguageCode[]): LanguageCode[] {
    return (targets ?? []).filter((code) => code !== source);
  }

  private pickLanguage(entry: TermdatEntry, code: LanguageCode): TermdatLanguageDetail | undefined {
    return entry.languageDetails?.find((detail) => detail.languageCode === code);
  }

  private summarize(detail: TermdatLanguageDetail | undefined): string {
    if (!detail) {
      return '';
    }

    const candidate =
      detail.terminus ||
      detail.name ||
      detail.phraseology ||
      detail.abbreviation ||
      detail.definition ||
      detail.note ||
      '';

    return this.cleanInline(candidate);
  }

  private extractDefinition(detail: TermdatLanguageDetail | undefined): string {
    if (!detail) {
      return '';
    }

    const candidate = detail.definition || detail.context || detail.note || '';
    return this.cleanInline(candidate);
  }

  private joinLines(lines: string[]): string {
    return lines
      .map((line) => this.cleanInline(line))
      .filter(Boolean)
      .join('<br>');
  }

  private cleanInline(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
