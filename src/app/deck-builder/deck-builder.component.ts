import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import {MatButtonModule} from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LanguageCode } from '../core/models/termdat';
import { DeckMapperService } from '../core/services/deck-mapper.service';
import { DeckExporter, TsvDeckExporterService } from '../core/services/deck-exporter.service';
import { TermdatRepository } from '../core/services/termdat.repository';
import { DeckSourceComponent } from './filters/deck-source.component';
import { DeckTargetsComponent } from './filters/deck-targets.component';
import { DeckReferencesComponent } from './references/deck-references.component';

const LANGUAGE_OPTIONS = [
  { code: 'DE', label: 'German' },
  { code: 'FR', label: 'French' },
  { code: 'IT', label: 'Italian' },
  { code: 'EN', label: 'English' },
] as const;

@Component({
  selector: 'app-deck-builder',
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DeckSourceComponent,
    DeckTargetsComponent,
    DeckReferencesComponent,
  ],
  templateUrl: './deck-builder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'deck-builder',
  },
})
export class DeckBuilderComponent {
  private readonly repository = inject(TermdatRepository);
  private readonly deckMapper = inject(DeckMapperService);
  private readonly deckExporter: DeckExporter = inject(TsvDeckExporterService);

  readonly languages: ReadonlyArray<{ code: LanguageCode; label: string }> = LANGUAGE_OPTIONS;
  readonly exportLimit = 5000;

  readonly sourceLanguage = this.repository.sourceLanguage;
  readonly targetLanguages = this.repository.targetLanguages;

  readonly collectionsFilter = this.repository.collectionsFilter;
  readonly totalEntries = this.repository.totalEntryCount;

  readonly availableTargets = computed(() =>
    this.languages.filter(({ code }) => code !== this.sourceLanguage()),
  );

  readonly collections = this.repository.collections;
  readonly entries = this.repository.entries;
  readonly collectionResource = this.repository.collectionsResource;
  readonly searchResource = this.repository.searchResource;
  readonly isLoadingData = this.repository.isLoadingData;

  readonly hasCollectionSelection = computed(() => this.collectionsFilter().length > 0);
  readonly hasTargetSelection = computed(() => this.targetLanguages().length > 0);
  readonly canSearch = computed(
    () => this.collectionResource.hasValue() && this.hasCollectionSelection() && this.hasTargetSelection(),
  );

  readonly entryCount = computed(() => this.entries().length);

  onSourceLanguageChange(language: LanguageCode): void {
    if (language === this.sourceLanguage()) {
      return;
    }

    this.sourceLanguage.set(language);

    this.repository.targetLanguages.update((targets) =>
      targets.filter((code) => code !== language),
    );
  }

  onTargetLanguagesChange(languages: LanguageCode[]): void {
    this.repository.targetLanguages.set(languages);
  }

  onCollectionIdsChange(collectionIds: ReadonlyArray<number | string>): void {
    this.collectionsFilter.set(collectionIds.map((id) => Number(id)));
  }

  async onExport(): Promise<void> {
    if (!this.totalEntries()) {
      return;
    }

    const entries = await this.repository.fetchAllEntries(this.exportLimit);
    if (!entries.length) {
      return;
    }

    const rows = this.deckMapper.buildRows(entries, this.sourceLanguage(), this.targetLanguages());
    this.deckExporter.export(
      this.deckMapper.buildFileName(this.sourceLanguage(), this.targetLanguages()),
      rows,
    );
  }
}
