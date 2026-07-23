import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProgressFacade } from '../../../core/facade/progress.facade';
import { ProgressWindow } from '../../../core/models/progress.model';
import { CompleteStreakHeroComponent } from './complete-streak-hero/complete-streak-hero.component';
import { NutritionistReportCardComponent } from './nutritionist-report-card/nutritionist-report-card.component';
import { ProgressTrendChartComponent } from './progress-trend-chart/progress-trend-chart.component';
import { ProgressWeightCardComponent } from './progress-weight-card/progress-weight-card.component';

@Component({
  standalone: true,
  selector: 'app-progress-tab',
  imports: [DecimalPipe, MatIconModule, CompleteStreakHeroComponent, NutritionistReportCardComponent, ProgressTrendChartComponent, ProgressWeightCardComponent],
  templateUrl: './progress-tab.component.html',
  styleUrl: './progress-tab.component.css',
})
export class ProgressTabComponent implements OnInit {
  protected readonly facade = inject(ProgressFacade);
  readonly checkInSaved = signal(false);
  readonly averageCalories = computed(() => this.average(this.facade.trends()?.caloriesIn ?? []));
  readonly averageWater = computed(() => this.average(this.facade.trends()?.waterL ?? []));
  readonly averageSteps = computed(() => this.average(this.facade.trends()?.steps ?? []));
  readonly weightDelta = computed(() => {
    const values = (this.facade.trends()?.weightKg ?? []).filter((value): value is number => value != null);
    return values.length > 1 ? values[values.length - 1] - values[0] : null;
  });

  ngOnInit(): void { void this.facade.loadSummary(); }
  selectWindow(window: ProgressWindow): void { void this.facade.setWindow(window); }
  async saveCheckIn(value: { weight: number; energyLevel?: number }): Promise<void> {
    this.checkInSaved.set(false);
    this.checkInSaved.set(await this.facade.logTodayWeight(value.weight, value.energyLevel));
  }
  private average(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
}
