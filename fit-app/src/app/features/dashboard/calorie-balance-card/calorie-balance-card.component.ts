import { Component, computed, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';

interface DayPoint {
  label: string;
  intake: number;
  burned: number;
}

@Component({
  selector: 'app-calorie-balance-card',
  standalone: true,
  imports: [DecimalPipe, MatIconModule, NgChartsModule],
  templateUrl: './calorie-balance-card.component.html',
  styleUrl: './calorie-balance-card.component.css',
})
export class CalorieBalanceCardComponent implements OnInit {
  private readonly userFacade = inject(UserFacade);

  ngOnInit(): void {
    void this.userFacade.loadDailyHistory();
  }

  private readonly days = computed<DayPoint[]>(() => {
    const history = this.userFacade.history();
    const today = this.userFacade.dailyData();
    const now = new Date();
    const result: DayPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];

      let entry: DailyUserData | null | undefined;
      if (i === 0) {
        entry = today;
      } else {
        entry = history.find(h => h.date === iso);
      }

      result.push({
        label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        intake: entry?.caloriesIntake ?? 0,
        burned: entry?.caloriesBurned ?? 0,
      });
    }
    return result;
  });

  readonly chartData = computed<ChartData<'bar'>>(() => ({
    labels: this.days().map(d => d.label),
    datasets: [
      {
        label: 'Intake',
        data: this.days().map(d => d.intake),
        backgroundColor: 'rgba(255, 64, 129, 0.72)',
        hoverBackgroundColor: 'rgba(255, 64, 129, 0.95)',
        borderRadius: 5,
        borderSkipped: false,
        barPercentage: 0.75,
        categoryPercentage: 0.65,
      },
      {
        label: 'Burned',
        data: this.days().map(d => d.burned),
        backgroundColor: 'rgba(124, 77, 255, 0.72)',
        hoverBackgroundColor: 'rgba(124, 77, 255, 0.95)',
        borderRadius: 5,
        borderSkipped: false,
        barPercentage: 0.75,
        categoryPercentage: 0.65,
      },
    ],
  }));

  readonly chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a24',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: 'rgba(255,255,255,0.7)',
        bodyColor: '#fff',
        padding: 10,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} kcal`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.35)', font: { family: 'Poppins', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255,255,255,0.35)',
          font: { family: 'Poppins', size: 11 },
          callback: v => `${v}`,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
      },
    },
    animation: { duration: 400, easing: 'easeOutQuart' },
  };

  // ── Summary stats ──────────────────────────────────────────────
  readonly hasData = computed(() => this.days().some(d => d.intake > 0 || d.burned > 0));

  readonly activeDays   = computed(() => this.days().filter(d => d.intake > 0 || d.burned > 0).length);
  readonly weeklyIntake = computed(() => this.days().reduce((s, d) => s + d.intake, 0));
  readonly weeklyBurned = computed(() => this.days().reduce((s, d) => s + d.burned, 0));
  readonly weeklyNet    = computed(() => this.weeklyIntake() - this.weeklyBurned());
  readonly avgIntake    = computed(() => this.activeDays() ? Math.round(this.weeklyIntake() / this.activeDays()) : 0);
  readonly avgBurned    = computed(() => this.activeDays() ? Math.round(this.weeklyBurned() / this.activeDays()) : 0);
}
