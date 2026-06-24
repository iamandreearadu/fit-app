import { Component, Output, EventEmitter, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardFacade } from '../../../core/facade/dashboard.facade';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  selector: 'app-quick-actions-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './quick-actions-strip.component.html',
  styleUrl: './quick-actions-strip.component.css',
})
export class QuickActionsStripComponent {
  protected readonly dashFacade = inject(DashboardFacade);
  protected readonly groqFacade = inject(GroqAiFacade);
  protected readonly userFacade = inject(UserFacade);

  @Output() openMealPicker = new EventEmitter<void>();
  @Output() openAiAnalyze = new EventEmitter<void>();
  @Output() openCalorieBalance = new EventEmitter<void>();
  @Output() openActivityPicker = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  isWaterConfirming = signal(false);

  addWater(): void {
    this.dashFacade.adjustWaterMl(500);
    this.isWaterConfirming.set(true);
    setTimeout(() => this.isWaterConfirming.set(false), 1200);
  }

  get activityLabel(): string {
    const type = this.dashFacade.activityType();
    if (!type) return 'Set activity';
    const labels: Record<string, string> = {
      'strength-training': 'Strength',
      'cardio': 'Cardio',
      'hiit-training': 'HIIT',
      'active-rest-day': 'Active Rest',
      'rest-day': 'Rest Day',
    };
    if (type.startsWith('workout:')) return 'Workout';
    return labels[type] ?? type;
  }

  get activityIcon(): string {
    const type = this.dashFacade.activityType();
    if (!type) return 'bolt';
    const icons: Record<string, string> = {
      'strength-training': 'fitness_center',
      'cardio': 'directions_run',
      'hiit-training': 'flash_on',
      'active-rest-day': 'self_improvement',
      'rest-day': 'bedtime',
    };
    if (type.startsWith('workout:')) return 'sports';
    return icons[type] ?? 'bolt';
  }
}
