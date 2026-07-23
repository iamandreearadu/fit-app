import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProgressService } from '../../api/progress.service';
import { ProgressSummaryDto, ProgressWindow } from '../models/progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressFacade {
  private readonly api = inject(ProgressService);

  readonly summary = signal<ProgressSummaryDto | null>(null);
  readonly loading = signal(false);
  readonly refreshingReport = signal(false);
  readonly savingCheckIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly window = signal<ProgressWindow>(7);
  readonly streak = computed(() => this.summary()?.streak ?? null);
  readonly weeklyReport = computed(() => this.summary()?.weeklyReport ?? null);
  readonly trends = computed(() => this.summary()?.trends ?? null);

  async loadSummary(window: ProgressWindow = this.window()): Promise<void> {
    this.window.set(window);
    this.loading.set(true);
    this.error.set(null);
    try {
      this.summary.set(await firstValueFrom(this.api.getSummary(window)));
    } catch {
      this.error.set('Progress data could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async setWindow(window: ProgressWindow): Promise<void> {
    if (window === this.window() && this.summary()) return;
    await this.loadSummary(window);
  }

  async refreshReport(): Promise<void> {
    if (this.refreshingReport()) return;
    this.refreshingReport.set(true);
    try {
      const report = await firstValueFrom(this.api.refreshReport());
      this.summary.update(value => value ? { ...value, weeklyReport: report } : value);
    } catch {
      this.error.set('The nutritionist report could not be refreshed.');
    } finally {
      this.refreshingReport.set(false);
    }
  }

  async logTodayWeight(weight: number, energyLevel?: number): Promise<boolean> {
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) return false;
    if (energyLevel != null && (energyLevel < 1 || energyLevel > 5)) return false;
    this.savingCheckIn.set(true);
    try {
      await firstValueFrom(this.api.logCheckIn({
        date: new Date().toISOString().slice(0, 10),
        manualWeight: weight,
        ...(energyLevel != null ? { energyLevel } : {}),
      }));
      await this.loadSummary(this.window());
      return true;
    } catch {
      this.error.set('Your check-in could not be saved.');
      return false;
    } finally {
      this.savingCheckIn.set(false);
    }
  }
}
