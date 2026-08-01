import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ProgressTrendsDto } from '../../../../core/models/progress.model';

@Component({
  selector: 'app-progress-weight-card',
  standalone: true,
  imports: [FormsModule, MatIconModule, NgChartsModule],
  templateUrl: './progress-weight-card.component.html',
  styleUrl: './progress-weight-card.component.css',
})
export class ProgressWeightCardComponent implements OnChanges {
  @Input({ required: true }) trends!: ProgressTrendsDto;
  @Input() saving = false;
  @Input() saved = false;
  @Output() saveCheckIn = new EventEmitter<{ weight: number; energyLevel?: number }>();
  weight: number | null = null;
  energyLevel: number | null = null;
  submitted = false;
  chart: ChartConfiguration<'line'> = { type: 'line', data: { labels: [], datasets: [] } };
  readonly energyOptions = [1, 2, 3, 4, 5];
  private editingCheckIn = false;

  get hasData(): boolean { return this.trends?.weightKg.some(value => value != null) ?? false; }
  get valid(): boolean { return this.weight != null && this.weight >= 30 && this.weight <= 300; }

  ngOnChanges(): void {
    if (!this.trends) return;
    this.hydrateTodayCheckIn();
    const primary = this.cssToken('--primary', '#7c4dff');
    const streak = this.cssToken('--color-streak', '#ff9f40');
    const tooltip = this.cssToken('--surface-elevated', '#17171c');
    const border = this.cssToken('--border-subtle', 'rgba(255,255,255,.08)');
    const muted = this.cssToken('--text-muted', 'rgba(255,255,255,.35)');
    const raw = this.trends.weightKg.map(value => value ?? Number.NaN);
    this.chart = {
      type: 'line',
      data: {
        labels: this.trends.dates.map(value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
        datasets: [
          { label: 'Weight', data: raw, borderColor: primary, backgroundColor: primary, pointRadius: 4, spanGaps: true, tension: 0 },
          { label: '7-day average', data: this.movingAverage(this.trends.weightKg), borderColor: streak, borderDash: [5, 5], pointRadius: 0, spanGaps: true, tension: .35 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: tooltip, borderColor: border, borderWidth: 1 } },
        scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 7, font: { family: 'Poppins', size: 10 } } }, y: { grid: { color: border }, border: { display: false }, ticks: { color: muted, font: { family: 'Poppins', size: 10 } } } },
      },
    };
  }

  submit(): void {
    this.submitted = true;
    if (!this.valid || this.saving) return;
    this.saveCheckIn.emit({ weight: this.weight!, ...(this.energyLevel != null ? { energyLevel: this.energyLevel } : {}) });
  }

  markCheckInEdited(): void {
    this.editingCheckIn = true;
  }

  selectEnergyLevel(level: number): void {
    this.energyLevel = level;
    this.markCheckInEdited();
  }

  private hydrateTodayCheckIn(): void {
    const today = new Date().toISOString().slice(0, 10);
    const todayIndex = this.trends.dates.indexOf(today);
    if (todayIndex < 0 || (this.editingCheckIn && !this.saved)) return;

    this.weight = this.trends.weightKg[todayIndex] ?? null;
    this.energyLevel = this.trends.energyLevel[todayIndex] ?? null;
    this.editingCheckIn = false;
    this.submitted = false;
  }

  private movingAverage(values: Array<number | null>): number[] {
    return values.map((_, index) => {
      const sample = values.slice(Math.max(0, index - 6), index + 1).filter((value): value is number => value != null);
      return sample.length ? Number((sample.reduce((sum, value) => sum + value, 0) / sample.length).toFixed(2)) : Number.NaN;
    });
  }

  private cssToken(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }
}
