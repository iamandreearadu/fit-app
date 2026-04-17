import { Component, OnInit, inject, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { RecentWorkout } from '../../../../core/models/stats.model';

const CHART_PRIMARY = '#7c4dff';      // --primary
const CHART_ACCENT = '#ff4081';       // --accent
const CHART_SURFACE = '#1a1a24';      // --surface-card
const CHART_TEXT = '#ffffff';

@Component({
  selector: 'app-stats-tab',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, NgChartsModule],
  templateUrl: './stats-tab.component.html',
  styleUrl: './stats-tab.component.css'
})
export class StatsTabComponent implements OnInit {
  isOwnProfile = input(false);
  userId = input.required<string>();

  protected readonly facade = inject(SocialFacade);

  // Derived booleans for template (arrow functions not allowed in Angular templates)
  readonly volumeEmpty = computed(() => {
    const vols = this.facade.publicStats()?.weeklyVolumes ?? [];
    return vols.length === 0 || vols.every(w => w.volumeKg === 0);
  });
  readonly publicRecentWorkouts = computed<RecentWorkout[]>(() =>
    this.facade.publicStats()?.recentWorkouts ?? []
  );

  // Volume chart config (shared — own profile also uses publicStats from the API)
  readonly volumeChartOther = computed<ChartConfiguration<'line'>>(() => {
    const stats = this.facade.publicStats();
    const vols = stats?.weeklyVolumes ?? [];
    return {
      type: 'line',
      data: {
        labels: vols.map(w => {
          const d = new Date(w.weekStart);
          return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
        }),
        datasets: [{
          data: vols.map(w => w.volumeKg),
          borderColor: CHART_PRIMARY,
          backgroundColor: 'rgba(124,77,255,0.12)',
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

  private lineChartOptions(tooltipSuffix: string): ChartConfiguration<'line'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_SURFACE,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: 'rgba(255,255,255,0.7)',
          bodyColor: CHART_TEXT,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} ${tooltipSuffix}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'rgba(255,255,255,0.35)', font: { family: 'Poppins', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { display: false }
        },
        y: {
          ticks: { color: 'rgba(255,255,255,0.35)', font: { family: 'Poppins', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { display: false }
        }
      },
      animation: { duration: 400, easing: 'easeOutQuart' }
    };
  }

  ngOnInit(): void {
    if (this.userId()) {
      this.facade.loadPublicStats(this.userId());
    }
  }

  retryLoadStats(): void {
    this.facade.loadPublicStats(this.userId());
  }

  formatVolume(kg: number): string {
    if (kg === 0) return '0 kg';
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${Math.round(kg)} kg`;
  }
}
