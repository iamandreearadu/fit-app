import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OnboardingService } from '../../api/onboarding.service';
import { AlertService } from '../../shared/services/alert.service';
import {
  BiometricsRequest,
  OnboardingStatusResponse,
  YourNumbersResponse,
} from '../models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingFacade {
  private readonly svc = inject(OnboardingService);
  private readonly alerts = inject(AlertService);

  // ── State signals (private writable, readonly public projections) ────────
  private readonly _yourNumbers      = signal<YourNumbersResponse | null>(null);
  private readonly _onboardingStatus = signal<OnboardingStatusResponse | null>(null);
  private readonly _loading          = signal(false);

  readonly yourNumbers      = this._yourNumbers.asReadonly();
  readonly onboardingStatus = this._onboardingStatus.asReadonly();
  readonly loading          = this._loading.asReadonly();

  // ── Submit biometrics → returns YourNumbersResponse for immediate reveal ──
  async submitBiometrics(req: BiometricsRequest): Promise<YourNumbersResponse | null> {
    this._loading.set(true);
    try {
      const res = await firstValueFrom(this.svc.submitBiometrics(req));
      this._yourNumbers.set(res);
      // Mark biometrics as the last completed step in local cache
      this._onboardingStatus.set({
        isComplete: false,
        lastCompletedStep: 'biometrics_complete',
        nextStep: 'first_action',
      });
      return res;
    } catch {
      this.alerts.error('Failed to save biometrics. Please try again.');
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  // ── Record an onboarding step (fire-and-forget; non-critical) ─────────────
  async recordStep(stepName: 'carousel_seen' | 'biometrics_complete' | 'first_action_taken'): Promise<void> {
    // Optimistic local update BEFORE the API call so guards see the new state
    if (stepName === 'carousel_seen') {
      this._onboardingStatus.set({
        isComplete: false,
        lastCompletedStep: 'carousel_seen',
        nextStep: 'biometrics',
      });
    }
    if (stepName === 'first_action_taken') {
      this._onboardingStatus.set({
        isComplete: true,
        lastCompletedStep: 'first_action_taken',
        nextStep: null,
      });
    }

    try {
      await firstValueFrom(this.svc.recordStep({ stepName }));
    } catch {
      // Non-critical — step tracking failure should NOT block the user flow
      console.warn(`[OnboardingFacade] Failed to record onboarding step: ${stepName}`);
    }
  }

  // ── Load and cache onboarding status (called by OnboardingGuard) ──────────
  async loadStatus(): Promise<OnboardingStatusResponse | null> {
    try {
      const status = await firstValueFrom(this.svc.getStatus());
      this._onboardingStatus.set(status);
      return status;
    } catch {
      // Return null — guard will allow navigation rather than block on error
      return null;
    }
  }

  // ── Load "Your Numbers" — fallback for the reveal screen on hard refresh ──
  async loadYourNumbers(): Promise<void> {
    try {
      const numbers = await firstValueFrom(this.svc.getYourNumbers());
      this._yourNumbers.set(numbers);
    } catch {
      this.alerts.error('Failed to load your metrics. Please try again.');
    }
  }

  // ── Reset cached status (called on logout) ────────────────────────────────
  resetStatus(): void {
    this._onboardingStatus.set(null);
    this._yourNumbers.set(null);
  }
}
