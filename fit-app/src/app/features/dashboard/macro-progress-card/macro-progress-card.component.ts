import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** @deprecated Legacy interface — use MacroProgressItemDto[] via NutritionCardComponent */
interface MacroProgressDto {
  proteinConsumedG: number;
  proteinTargetG: number;
  carbsConsumedG: number;
  carbsTargetG: number;
  fatConsumedG: number;
  fatTargetG: number;
}

@Component({
  selector: 'app-macro-progress-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './macro-progress-card.component.html',
  styleUrl: './macro-progress-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacroProgressCardComponent {
  @Input() data: MacroProgressDto | null = null;
  @Input() loading: boolean = false;

  get proteinPct(): number {
    const d = this.data;
    if (!d || d.proteinTargetG <= 0) return 0;
    return Math.min((d.proteinConsumedG / d.proteinTargetG) * 100, 100);
  }

  get carbsPct(): number {
    const d = this.data;
    if (!d || d.carbsTargetG <= 0) return 0;
    return Math.min((d.carbsConsumedG / d.carbsTargetG) * 100, 100);
  }

  get fatPct(): number {
    const d = this.data;
    if (!d || d.fatTargetG <= 0) return 0;
    return Math.min((d.fatConsumedG / d.fatTargetG) * 100, 100);
  }

  getBarState(pct: number): 'low' | 'normal' | 'near-complete' {
    if (pct >= 90) return 'near-complete';
    if (pct <= 50) return 'low';
    return 'normal';
  }
}
