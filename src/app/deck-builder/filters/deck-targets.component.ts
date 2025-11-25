import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { LanguageCode } from '../../core/models/termdat';

@Component({
  selector: 'app-deck-targets',
  imports: [CommonModule, MatChipsModule],
  templateUrl: './deck-targets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckTargetsComponent {
  readonly languages = input.required<ReadonlyArray<{ code: LanguageCode; label: string }>>();
  readonly sourceLanguage = input.required<LanguageCode>();
  readonly targetLanguages = input.required<ReadonlyArray<LanguageCode>>();
  readonly disabled = input(false);
  readonly targetLanguagesChange = output<LanguageCode[]>();

  isLocked(code: LanguageCode): boolean {
    const targets = this.targetLanguages();
    return targets.length === 1 && targets.includes(code);
  }

  updateTargetLanguage(code: LanguageCode, selected: boolean): void {
    if (this.disabled()) {
      return;
    }
    const current = new Set(this.targetLanguages());
    if (selected) {
      current.add(code);
    } else if (current.size <= 1) {
      return;
    } else {
      current.delete(code);
    }
    this.targetLanguagesChange.emit(Array.from(current));
  }
}
