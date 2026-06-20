import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DailyUserDataService } from '../services/daily-user-data.service';
import { UserFacade } from './user.facade';
import { DailyUserData } from '../models/daily-user-data.model';
import { DashboardApiService } from '../../api/dashboard.service';
import {
  DashboardTodayDto,
  AiInsightDto,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly userFacade = inject(UserFacade);
  private readonly dailyUserSrv = inject(DailyUserDataService);
  private readonly dashboardApiSvc = inject(DashboardApiService);

  // ── Aggregated today DTO ─────────────────────────────────────────────
  readonly dashboardToday = signal<DashboardTodayDto | null>(null);
  readonly isDashboardLoading = signal(false);
  readonly dashboardError = signal<string | null>(null);

  // ── AI insight (separate async call) ────────────────────────────────
  readonly aiInsight = signal<AiInsightDto | null>(null);
  readonly isAiInsightLoading = signal(false);
  readonly aiInsightError = signal<string | null>(null);

  // ── Writable metric signals (for check-in form + auto-save) ─────────
  readonly currentDateIso = signal<string>(new Date().toISOString().slice(0, 10));
  readonly waterConsumedL = signal<number>(0);
  readonly activityType   = signal<string | null>(null);
  readonly steps          = signal<number>(0);
  readonly stepTarget     = signal<number>(3000);
  readonly macrosPct      = signal<{ protein: number; carbs: number; fats: number }>({
    protein: 0, carbs: 0, fats: 0,
  });
  readonly caloriesBurned = signal<number>(0);

  // ── Auto-save status ─────────────────────────────────────────────────
  readonly autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ── Validation ───────────────────────────────────────────────────────
  // ── Delegate reads to existing service signals ───────────────────────
  readonly dailyDataStats         = this.dailyUserSrv.stats;
  readonly dailyDataLoading       = this.dailyUserSrv.loading;
  readonly waterProgress          = this.dailyUserSrv.waterProgress;
  readonly waterTargetFromMetrics = this.userFacade.waterTargetFromMetrics;
  readonly todaySummary           = this.userFacade.todaySummary;

  // ── Hydration guard (suppresses auto-save during data load) ─────────
  private readonly isHydrated = signal(false);
  private lastLoadedJson: string | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {      this.waterConsumedL();
      this.activityType();
      this.steps();
      this.stepTarget();
      this.macrosPct();
      this.caloriesBurned();
      if (!this.isHydrated()) return;
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.performAutoSave(), 1500);
    });
  }

  // ── Aggregated load ──────────────────────────────────────────────────

  async loadDashboardToday(): Promise<void> {
    this.isDashboardLoading.set(true);
    this.dashboardError.set(null);
    try {
      const data = await firstValueFrom(this.dashboardApiSvc.getToday());
      this.dashboardToday.set(data);
      // Hydrate writable signals so auto-save & check-in form work correctly.
      this.isHydrated.set(false);      this.waterConsumedL.set(+(data.water.value / 1000).toFixed(3));
      this.steps.set(Math.round(data.steps.value));
      this.stepTarget.set(Math.round(data.steps.goal) || 3000);
      this.caloriesBurned.set(Math.round(data.burned.value));
      this.lastLoadedJson = this.buildPayloadJson();
      queueMicrotask(() => this.isHydrated.set(true));
    } catch {
      this.dashboardError.set('Failed to load dashboard data');
    } finally {
      this.isDashboardLoading.set(false);
    }
  }

  async loadAiInsight(): Promise<void> {
    this.isAiInsightLoading.set(true);
    this.aiInsightError.set(null);
    try {
      const data = await firstValueFrom(this.dashboardApiSvc.getAiInsight());
      this.aiInsight.set(data);
    } catch {
      this.aiInsightError.set('Could not load insight');
    } finally {
      this.isAiInsightLoading.set(false);
    }
  }

  // ── Legacy data load (used by PreviousDailyUserData etc.) ───────────

  async loadTodayData(): Promise<void> {
    this.isHydrated.set(false);
    await this.userFacade.loadDaily();
    await this.userFacade.loadTodaySummary();
    await this.userFacade.loadWorkoutTemplates();

    const d = this.dailyUserSrv.daily();    this.waterConsumedL.set(d?.waterConsumedL ?? 0);
    this.activityType.set(d?.activityType ?? null);
    this.steps.set(d?.steps ?? 0);
    this.stepTarget.set(d?.stepTarget ?? 3000);
    this.macrosPct.set({
      protein: d?.macrosPct?.protein ?? 0,
      carbs:   d?.macrosPct?.carbs   ?? 0,
      fats:    d?.macrosPct?.fats    ?? 0,
    });
    this.caloriesBurned.set(d?.caloriesBurned ?? 0);

    this.lastLoadedJson = this.buildPayloadJson();
    queueMicrotask(() => this.isHydrated.set(true));
  }

  // ── Quick-action mutations ───────────────────────────────────────────

  adjustWaterMl(deltaMl: number): void {
    // Optimistic update to dashboardToday signal so HydrationStepsCard rerenders
    const current = this.dashboardToday();
    if (current) {
      this.dashboardToday.set({
        ...current,
        water: { ...current.water, value: Math.max(0, current.water.value + deltaMl) },
      });
    }
    // Keep legacy writable signal in sync for auto-save
    const nextL = Math.max(0, +(this.waterConsumedL() + deltaMl / 1000).toFixed(3));
    this.waterConsumedL.set(nextL);
    this.dailyUserSrv.setDailyFromPatch({ waterConsumedL: nextL });
  }

  adjustSteps(delta: number): void {
    const current = this.dashboardToday();
    if (current) {
      this.dashboardToday.set({
        ...current,
        steps: { ...current.steps, value: Math.max(0, current.steps.value + delta) },
      });
    }
    const next = Math.max(0, this.steps() + delta);
    this.steps.set(next);
    this.dailyUserSrv.setDailyFromPatch({ steps: next });
  }

  adjustCaloriesBurned(delta: number): void {
    const current = this.dashboardToday();
    if (current) {
      this.dashboardToday.set({
        ...current,
        burned: { ...current.burned, value: Math.max(0, current.burned.value + delta) },
        calorieBalance: {
          ...current.calorieBalance,
          burned: Math.max(0, current.calorieBalance.burned + delta),
        },
      });
    }
    const next = Math.max(0, this.caloriesBurned() + delta);
    this.caloriesBurned.set(next);
    this.dailyUserSrv.setDailyFromPatch({ caloriesBurned: next });
  }

  // ── Auto-save ────────────────────────────────────────────────────────

  private buildPayloadJson(): string {
    return JSON.stringify({      waterConsumedL: this.waterConsumedL(),
      activityType:   this.activityType(),
      steps:          this.steps(),
      stepTarget:     this.stepTarget(),
      macrosPct:      this.macrosPct(),
      caloriesBurned: this.caloriesBurned(),
    });
  }

  private async performAutoSave(): Promise<void> {
    const currentJson = this.buildPayloadJson();
    if (currentJson === this.lastLoadedJson) return;

    this.autoSaveStatus.set('saving');
    try {
      const patch: Partial<DailyUserData> = {
        date:           this.currentDateIso(),
        waterConsumedL: this.waterConsumedL(),
        steps:          this.steps(),
        stepTarget:     this.stepTarget(),
        macrosPct:      this.macrosPct(),
        caloriesBurned: this.caloriesBurned(),      };
      if (this.activityType() != null) {
        patch.activityType = this.activityType() as DailyUserData['activityType'];
      }
      await this.userFacade.saveDaily(patch);
      this.lastLoadedJson = currentJson;
      this.autoSaveStatus.set('saved');
      setTimeout(() => {
        if (this.autoSaveStatus() === 'saved') this.autoSaveStatus.set('idle');
      }, 2000);
    } catch {
      this.autoSaveStatus.set('error');
    }
  }
}
