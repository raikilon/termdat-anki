import { Injectable } from '@angular/core';
import { DeckRow } from '../models/anki';
import { LanguageCode, TermdatEntry, TermdatLanguageDetail } from '../models/termdat';

@Injectable({ providedIn: 'root' })
export class DeckMapperService {
  buildRows(entries: TermdatEntry[], source: LanguageCode, targets: LanguageCode[]): DeckRow[] {
    if (!entries?.length) {
      return [];
    }
    const normalizedTargets = targets.filter((code) => code !== source);
    return entries
      .map((entry) => {
        const sourceDetail = this.pickLanguage(entry, source);
        const backLines = normalizedTargets
          .map((code) => {
            const detail = this.pickLanguage(entry, code);
            const text = this.summarize(detail);
            return text ? `${code}: ${text}` : '';
          })
          .filter(Boolean);
        const back = this.joinLines(backLines);
        return {
          front: this.summarize(sourceDetail),
          back: back || '—',
          definition: this.extractDefinition(sourceDetail),
          url: this.cleanInline(entry.url ?? ''),
        };
      })
      .filter((row) => !!row.front || !!row.back);
  }

  buildFileName(source: LanguageCode, targets: LanguageCode[]): string {
    const targetSegment = targets.length
      ? targets
          .filter((code) => code !== source)
          .map((code) => code.toLowerCase())
          .join('-')
      : 'deck';
    return `termdat-${source.toLowerCase()}-to-${targetSegment}.tsv`;
  }

  private pickLanguage(entry: TermdatEntry, code: LanguageCode): TermdatLanguageDetail | undefined {
    return entry.languageDetails.find((detail) => detail.languageCode === code);
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
    return value.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
