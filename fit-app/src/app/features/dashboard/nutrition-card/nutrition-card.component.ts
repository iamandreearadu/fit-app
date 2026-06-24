import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressBarComponent } from '../shared/progress-bar/progress-bar.component';
import { MacroProgressItemDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-nutrition-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, ProgressBarComponent],
  templateUrl: './nutrition-card.component.html',
  styleUrl: './nutrition-card.component.css',
})
export class NutritionCardComponent {
  @Input() macros: MacroProgressItemDto[] | null = null;
  @Input() eaten   = 0;
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() openMealPicker = new EventEmitter<void>();
  @Output() retry          = new EventEmitter<void>();

  get isEmpty(): boolean {
    return !this.macros || this.macros.every(m => m.consumed === 0);
  }

  colorClass(name: string): 'protein' | 'carbs' | 'fat' {
    if (name === 'Protein') return 'protein';
    if (name === 'Carbs')   return 'carbs';
    return 'fat';
  }
}
