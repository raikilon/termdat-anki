import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DeckBuilderComponent } from './deck-builder/deck-builder.component';

@Component({
  selector: 'app-root',
  imports: [DeckBuilderComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-shell',
  },
})
export class App { }
