import { Component, Input, OnChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChartConfiguration, ChartDataset } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ProgressTrendKind, ProgressTrendsDto } from '../../../../core/models/progress.model';

@Component({
  selector: 'app-progress-trend-chart',
  standalone: true,
  imports: [MatIconModule, NgChartsModule],
  templateUrl: './progress-trend-chart.component.html',
  styleUrl: './progress-trend-chart.component.css',
})
export class ProgressTrendChartComponent implements OnChanges {
  @Input({ required: true }) kind!: ProgressTrendKind;
  @Input({ required: true }) trends!: ProgressTrendsDto;
  chart: ChartConfiguration<'bar' | 'line'> = { type: 'bar', data: { labels: [], datasets: [] } };
  empty = true;
  title = '';
  subtitle = '';
  icon = '';
  summary = '';

  ngOnChanges(): void { this.buildChart(); }

  private buildChart(): void {
    if (!this.trends || !this.kind) return;
    const labels = this.trends.dates.map(value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const datasets: ChartDataset<'bar' | 'line', number[]>[] = [];
    if (this.kind === 'calories') {
      this.title = 'Calories in vs out'; this.subtitle = 'Daily energy pattern'; this.icon = 'local_fire_department';
      datasets.push(this.bar('Consumed', this.trends.caloriesIn, this.token('--primary', '#7c4dff')));
      datasets.push(this.bar('Burned', this.trends.caloriesBurned, this.token('--color-success', '#34d399')));
      if (this.trends.tdee > 0) datasets.push(this.line('TDEE', labels.map(() => this.trends.tdee), this.token('--color-streak', '#ff9f40')));
      this.empty = !this.trends.caloriesIn.some(Boolean) && !this.trends.caloriesBurned.some(Boolean);
      this.summary = `Calories over the last ${this.trends.window} days.`;
    } else if (this.kind === 'macros') {
      this.title = 'Macro balance'; this.subtitle = 'Grams logged per day'; this.icon = 'restaurant';
      datasets.push(this.bar('Protein', this.trends.proteinG, this.token('--macro-protein', '#a78bfa')));
      datasets.push(this.bar('Carbs', this.trends.carbsG, this.token('--macro-carbs', '#38bdf8')));
      datasets.push(this.bar('Fats', this.trends.fatG, this.token('--macro-fat', '#ff4081')));
      this.empty = ![...this.trends.proteinG, ...this.trends.carbsG, ...this.trends.fatG].some(Boolean);
      this.summary = `Protein, carbohydrate and fat intake over ${this.trends.window} days.`;
    } else if (this.kind === 'hydration') {
      this.title = 'Hydration'; this.subtitle = `Goal ${this.trends.waterTargetL.toFixed(1)} L`; this.icon = 'water_drop';
      datasets.push(this.bar('Water', this.trends.waterL, this.token('--color-hydration', '#38bdf8')));
      if (this.trends.waterTargetL > 0) datasets.push(this.line('Goal', labels.map(() => this.trends.waterTargetL), this.token('--primary-light', '#a78bfa')));
      this.empty = !this.trends.waterL.some(Boolean);
      this.summary = `Water consumption compared with your daily goal.`;
    } else {
      this.title = 'Steps'; this.subtitle = 'Daily movement'; this.icon = 'directions_walk';
      datasets.push(this.bar('Steps', this.trends.steps, this.token('--color-success', '#34d399')));
      if (this.trends.stepTarget.some(Boolean)) datasets.push(this.line('Goal', this.trends.stepTarget, this.token('--primary-light', '#a78bfa')));
      this.empty = !this.trends.steps.some(Boolean);
      this.summary = `Daily steps compared with your step target.`;
    }
    this.chart = { type: 'bar', data: { labels, datasets }, options: this.options() };
  }

  private bar(label: string, data: number[], color: string): ChartDataset<'bar', number[]> {
    return { type: 'bar', label, data, backgroundColor: this.alpha(color, .58), hoverBackgroundColor: color, borderRadius: 5, maxBarThickness: 18 };
  }
  private line(label: string, data: number[], color: string): ChartDataset<'line', number[]> {
    return { type: 'line', label, data, borderColor: color, pointRadius: 0, borderDash: [5, 5], borderWidth: 1.5, tension: .25 };
  }
  private options(): ChartConfiguration<'bar' | 'line'>['options'] {
    const muted = this.token('--text-muted', 'rgba(255,255,255,.35)');
    const grid = this.token('--border-subtle', 'rgba(255,255,255,.06)');
    return { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: this.token('--surface-elevated', '#17171c'), borderColor: grid, borderWidth: 1, titleColor: '#fff', bodyColor: '#fff' } },
      scales: { x: { stacked: false, grid: { display: false }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 7, font: { family: 'Poppins', size: 10 } } },
        y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: muted, font: { family: 'Poppins', size: 10 }, callback: value => this.kind === 'steps' && Number(value) >= 1000 ? `${Number(value) / 1000}k` : value } } },
      animation: this.reducedMotion() ? false : { duration: 400, easing: 'easeOutQuart' } };
  }
  private token(name: string, fallback: string): string { return typeof document === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; }
  private alpha(color: string, opacity: number): string { if (color.startsWith('#') && color.length === 7) { const n = Number.parseInt(color.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${opacity})`; } return color; }
  private reducedMotion(): boolean { return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
}
