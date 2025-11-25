import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LanguageCode } from '../../core/models/termdat';

@Component({
  selector: 'app-deck-source',
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './deck-source.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckSourceComponent {
  readonly languages = input.required<ReadonlyArray<{ code: LanguageCode; label: string }>>();
  readonly sourceLanguage = input.required<LanguageCode>();
  readonly sourceLanguageChange = output<LanguageCode>();

  updateSourceLanguage(language: LanguageCode): void {
    if (language === this.sourceLanguage()) {
      return;
    }
    this.sourceLanguageChange.emit(language);
  }
}
