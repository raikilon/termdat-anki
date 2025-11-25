import { ChangeDetectionStrategy, Component, Signal, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Collection } from '../../core/models/termdat';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-deck-references',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './deck-references.component.html',
  styleUrl: './deck-references.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckReferencesComponent {
  readonly collections = input.required<Collection[]>();
  readonly collectionIds = input.required<ReadonlyArray<number>>();
  readonly collectionIdsChange = output<ReadonlyArray<number>>();
  readonly collectionsLoading = input(false);
  readonly collectionsError = input<unknown | undefined>(undefined);
  readonly searchTerm = signal('');

  readonly collectionsSorted = computed(() =>
    [...this.collections()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly filteredCollections: Signal<Collection[]> = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.collectionsSorted();
    }
    return this.collectionsSorted().filter(
      (collection) =>
        collection.name.toLowerCase().includes(term) ||
        collection.code.toLowerCase().includes(term),
    );
  });

  readonly selectedCollections = computed(() => this.collectionIds());

  addCollection(id: number): void {
    if (!Number.isFinite(id)) {
      return;
    }
    const normalized = new Set(this.selectedCollections());
    normalized.add(id);
    this.collectionIdsChange.emit(Array.from(normalized));
    this.searchTerm.set('');
  }

  removeCollection(id: number): void {
    const normalized = new Set(this.selectedCollections());
    normalized.delete(id);
    this.collectionIdsChange.emit(Array.from(normalized));
  }

  updateSearch(term: string): void {
    this.searchTerm.set(term ?? '');
  }

  clearSearchInput(input: EventTarget | null): void {
    const element = input as HTMLInputElement | null;
    if (element && element.value !== this.searchTerm()) {
      element.value = this.searchTerm();
    }
  }

  collectionLabel(id: number): string {
    const match = this.collections().find((item) => item.id === id);
    return match ? `${match.name} (${match.code})` : String(id);
  }
}
