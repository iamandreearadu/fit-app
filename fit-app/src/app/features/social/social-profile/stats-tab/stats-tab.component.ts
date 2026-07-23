import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { SocialProfileFacade } from '../../../../core/facade/social-profile.facade';
import { RecentWorkout, UserPublicStats } from '../../../../core/models/stats.model';

@Component({
  selector: 'app-stats-tab',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, NgChartsModule],
  templateUrl: './stats-tab.component.html',
  styleUrl: './stats-tab.component.css'
})
export class StatsTabComponent implements OnChanges {
  @Input() isOwnProfile = false;
  @Input() userId = '';

  protected readonly facade = inject(SocialProfileFacade);
  readonly stats = signal<UserPublicStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private requestVersion = 0;

  readonly volumeEmpty = computed(() => {
    const volumes = this.stats()?.weeklyVolumes ?? [];
    return volumes.length === 0 || volumes.every(week => week.volumeKg === 0);
  });

  readonly publicRecentWorkouts = computed<RecentWorkout[]>(() =>
    this.stats()?.recentWorkouts ?? []
  );

  readonly volumeSummary = computed(() => {
    const volumes = this.stats()?.weeklyVolumes ?? [];
    if (volumes.length === 0) return 'No weekly workout volume has been recorded.';

    const total = volumes.reduce((sum, week) => sum + week.volumeKg, 0);
    const first = volumes[0].volumeKg;
    const last = volumes[volumes.length - 1].volumeKg;
    const trend = last > first ? 'increased' : last < first ? 'decreased' : 'stayed the same';
    return `Weekly volume ${trend}, from ${this.formatVolume(first)} to ${this.formatVolume(last)}. ${this.formatVolume(total)} total across ${volumes.length} weeks.`;
  });

  readonly volumeChart = computed<ChartConfiguration<'line'>>(() => {
    const volumes = this.stats()?.weeklyVolumes ?? [];
    return {
      type: 'line',
      data: {
        labels: volumes.map(week => {
          const date = new Date(week.weekStart);
          return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
        }),
        datasets: [{
          data: volumes.map(week => week.volumeKg),
          borderColor: this.cssToken('--primary', '#7c4dff'),
          backgroundColor: `rgba(${this.cssToken('--primary-rgb', '124, 77, 255')}, 0.12)`,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 2
        }]
      },
      options: this.lineChartOptions('kg total')
    };
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId']) void this.loadStats();
  }

  retryLoadStats(): void {
    void this.loadStats();
  }

  formatVolume(kg: number): string {
    if (kg === 0) return '0 kg';
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${Math.round(kg)} kg`;
  }

  private async loadStats(): Promise<void> {
    const requestedUserId = this.userId.trim();
    const version = ++this.requestVersion;
    this.stats.set(null);
    this.error.set(null);

    if (!requestedUserId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    await this.facade.loadPublicStats(requestedUserId);

    // Only the latest input may publish data, errors, or loading state.
    if (version !== this.requestVersion || requestedUserId !== this.userId.trim()) return;

    this.stats.set(this.facade.publicStats());
    this.error.set(this.facade.publicStatsError());
    this.loading.set(false);
  }

  private lineChartOptions(tooltipSuffix: string): ChartConfiguration<'line'>['options'] {
    const textMuted = this.cssToken('--text-muted', 'rgba(255,255,255,0.35)');
    const borderSubtle = this.cssToken('--border-subtle', 'rgba(255,255,255,0.08)');
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: this.cssToken('--surface-elevated', '#1a1a22'),
          borderColor: borderSubtle,
          borderWidth: 1,
          titleColor: this.cssToken('--text-secondary', 'rgba(255,255,255,0.7)'),
          bodyColor: this.cssToken('--text-primary', '#fff'),
          callbacks: { label: context => ` ${context.parsed.y} ${tooltipSuffix}` }
        }
      },
      scales: {
        x: {
          ticks: { color: textMuted, font: { family: 'Poppins', size: 11 } },
          grid: { color: borderSubtle },
          border: { display: false }
        },
        y: {
          ticks: { color: textMuted, font: { family: 'Poppins', size: 11 } },
          grid: { color: borderSubtle },
          border: { display: false }
        }
      },
      animation: this.prefersReducedMotion() ? false : { duration: 400, easing: 'easeOutQuart' }
    };
  }

  private cssToken(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
}
