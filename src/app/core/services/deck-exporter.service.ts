import { Injectable } from '@angular/core';
import { DeckRow } from '../models/anki';

export interface DeckExporter {
  export(fileName: string, rows: DeckRow[]): void;
}


@Injectable({ providedIn: 'root' })
export class TsvDeckExporterService implements DeckExporter {
  export(fileName: string, rows: DeckRow[]): void {
    if (!rows.length) {
      return;
    }
    const content = rows
      .map((row) => this.trimTrailingEmpty([row.front, row.back, row.definition, row.url]).join('\t'))
      .join('\n');
    const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private trimTrailingEmpty(fields: string[]): string[] {
    const normalized = [...fields];
    while (normalized.length && normalized[normalized.length - 1].trim() === '') {
      normalized.pop();
    }
    return normalized;
  }
}
