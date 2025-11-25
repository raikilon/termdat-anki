import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { DeckRow } from '../models/anki';

export interface DeckExporter {
  export(fileName: string, rows: DeckRow[]): void;
}

@Injectable({ providedIn: 'root' })
export class TsvDeckExporterService implements DeckExporter {
  constructor(@Inject(DOCUMENT) private readonly document: Document) { }

  export(fileName: string, rows: DeckRow[]): void {
    if (!rows.length) {
      return;
    }

    const lines = rows.map((row) => {
      const fields = [
        row.front ?? '',
        row.back ?? '',
        row.definition ?? '',
        row.url ?? '',
      ];

      const trimmed = this.trimTrailingEmpty(fields);
      const escaped = trimmed.map((value) => this.escapeTsvField(value));
      return escaped.join('\t');
    });

    const content = '\uFEFF' + lines.join('\r\n');

    const blob = new Blob([content], {
      type: 'text/tab-separated-values;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.endsWith('.tsv') ? fileName : `${fileName}.tsv`;

    this.document.body.appendChild(anchor);
    anchor.click();
    this.document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private trimTrailingEmpty(fields: string[]): string[] {
    const normalized = [...fields];
    while (
      normalized.length &&
      normalized[normalized.length - 1].trim() === ''
    ) {
      normalized.pop();
    }
    return normalized;
  }

  private escapeTsvField(value: string): string {
    if (!/[\t\r\n"]/.test(value)) {
      return value;
    }
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
