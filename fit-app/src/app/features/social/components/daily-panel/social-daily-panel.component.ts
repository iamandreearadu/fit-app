import { Component, inject, Input, OnInit, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DailyUserDataService } from '../../../../core/services/daily-user-data.service';
import { UserFacade } from '../../../../core/facade/user.facade';

interface ActivityConfig {
  icon: string;
  color: string;
  label: string;
  modifier: string;
}

@Component({
  selector: 'app-social-daily-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './social-daily-panel.component.html',
  styleUrl: './social-daily-panel.component.css'
})
export class SocialDailyPanelComponent implements OnInit {
  /** Controls drawer visibility on mobile (managed by parent) */
  @Input() open = false;
  /** Parent listens to this to close the drawer on mobile */
  @Output() closeRequested = new EventEmitter<void>();

  private readonly dailySrv = inject(DailyUserDataService);
  private readonly userFacade = inject(UserFacade);

  readonly daily       = this.dailySrv.daily;
  readonly stats       = this.dailySrv.stats;
  readonly loading     = this.dailySrv.loading;
  readonly waterTarget  = this.dailySrv.waterTarget;
  readonly waterProgress = this.dailySrv.waterProgress;

  /** Macro grams */
  readonly proteinG = computed(() => this.daily()?.macrosPct?.protein ?? 0);
  readonly carbsG   = computed(() => this.daily()?.macrosPct?.carbs   ?? 0);
  readonly fatsG    = computed(() => this.daily()?.macrosPct?.fats    ?? 0);

  /** Macro kcal totals — used for proportional chart segments */
  readonly macroKcalTotal = computed(() => {
    const p = this.proteinG() * 4;
    const c = this.carbsG()   * 4;
    const f = this.fatsG()    * 9;
    return p + c + f || 0;
  });

  readonly macroHasData = computed(() => this.macroKcalTotal() > 0);

  readonly proteinPct = computed(() => {
    const t = this.macroKcalTotal(); if (!t) return 0;
    return Math.round((this.proteinG() * 4 / t) * 100);
  });
  readonly carbsPct = computed(() => {
    const t = this.macroKcalTotal(); if (!t) return 0;
    return Math.round((this.carbsG() * 4 / t) * 100);
  });
  readonly fatsPct = computed(() => {
    const t = this.macroKcalTotal(); if (!t) return 0;
    return Math.round((this.fatsG() * 9 / t) * 100);
  });

  // ── SVG donut chart (r=38, viewBox 0 0 100 100) ─────────────────────────
  private readonly CIRC = 2 * Math.PI * 38; // ≈ 238.76
  private readonly GAP  = 2.5;              // px gap between slices

  private dash(pct: number): string {
    const len = Math.max(0, pct / 100 * this.CIRC - this.GAP);
    return `${len} ${this.CIRC}`;
  }

  readonly proteinDash = computed(() => this.dash(this.proteinPct()));
  readonly carbsDash   = computed(() => this.dash(this.carbsPct()));
  readonly fatsDash    = computed(() => this.dash(this.fatsPct()));

  // Rotation: each arc starts where the previous one ends (12 o'clock = -90°)
  readonly proteinRotate = computed(() => -90);
  readonly carbsRotate   = computed(() => -90 + this.proteinPct() * 3.6);
  readonly fatsRotate    = computed(() => -90 + (this.proteinPct() + this.carbsPct()) * 3.6);

  readonly stepsPct = computed(() => {
    const s = this.stats();
    if (!s.stepTarget) return 0;
    return Math.min(100, Math.round((s.steps / s.stepTarget) * 100));
  });

  /** Signed net calories: intake − burned */
  readonly netCalories = computed(() => {
    const s = this.stats();
    return (s.caloriesIntake ?? 0) - (s.caloriesBurned ?? 0);
  });

  /** CSS modifier class for the net tile coloring */
  readonly calSignClass = computed((): 'surplus' | 'deficit' | 'balanced' => {
    const net = this.netCalories();
    if (net > 50)  return 'surplus';
    if (net < -50) return 'deficit';
    return 'balanced';
  });

  readonly activityConfig = computed((): ActivityConfig =>
    this.getActivityConfig(this.daily()?.activityType)
  );

  readonly todayLabel = computed(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  );

  ngOnInit(): void {
    if (!this.daily()) {
      this.userFacade.loadDaily();
    }
  }

  private getActivityConfig(type?: string): ActivityConfig {
    // Normalize: handle both title-case ('Strength Training') and kebab-case ('strength-training')
    // and workout-linked values ('workout:uid')
    if (type?.startsWith('workout:')) {
      return { icon: 'sports', color: '#a78bfa', label: 'Workout', modifier: 'strength' };
    }
    const key = (type ?? '').toLowerCase().replace(/\s+/g, '-');
    switch (key) {
      case 'strength-training': return { icon: 'fitness_center',   color: '#7c4dff', label: 'Strength',    modifier: 'strength' };
      case 'cardio':            return { icon: 'directions_run',   color: '#22d3ee', label: 'Cardio',      modifier: 'cardio' };
      case 'hiit-training':     return { icon: 'flash_on',         color: '#ff4081', label: 'HIIT',        modifier: 'hiit' };
      case 'active-rest-day':   return { icon: 'self_improvement', color: '#4caf50', label: 'Active Rest', modifier: 'active-rest' };
      default:                  return { icon: 'bedtime',          color: 'rgba(255,255,255,0.35)', label: 'Rest Day', modifier: 'rest' };
    }
  }
}
