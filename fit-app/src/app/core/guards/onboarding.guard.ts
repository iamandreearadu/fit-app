import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticationStore } from '../store/auth.store';
import { UserStore } from '../store/user.store';
import { OnboardingFacade } from '../facade/onboarding.facade';

/** Route map from backend nextStep values to Angular routes. */
const STEP_ROUTES: Record<string, string> = {
  carousel: '/onboarding/carousel',
  biometrics: '/onboarding/biometrics',
  first_action: '/onboarding/your-numbers',
};

/**
 * Blocks access to protected routes (user-dashboard, plans, etc.) until the
 * user has completed onboarding. Uses a cached signal first — only calls the
 * API on the first navigation after login. Reset on logout via OnboardingFacade.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly authStore: AuthenticationStore,
    private readonly userStore: UserStore,
    private readonly onboardingFacade: OnboardingFacade,
    private readonly router: Router,
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    // ── 1. Not authenticated → let AuthGuard handle the redirect ─────────────
    if (!this.authStore.authUser()) return true;

    // ── 2. User profile fast-path (pre-Fix-4 users & completed users) ────────
    if (this.userStore.user()?.onboardingCompleted === true) return true;

    // ── 3. Facade cache — avoids redundant API calls within a session ─────────
    const cached = this.onboardingFacade.onboardingStatus();
    if (cached !== null) {
      if (cached.isComplete) return true;
      return this.redirectToNextStep(cached.nextStep);
    }

    // ── 4. First check in this session — call the API ─────────────────────────
    const status = await this.onboardingFacade.loadStatus();
    if (!status || status.isComplete) return true;

    return this.redirectToNextStep(status.nextStep);
  }

  private redirectToNextStep(nextStep: string | null): UrlTree {
    const route = nextStep ? (STEP_ROUTES[nextStep] ?? '/onboarding/carousel') : '/onboarding/carousel';
    return this.router.createUrlTree([route]);
  }
}
