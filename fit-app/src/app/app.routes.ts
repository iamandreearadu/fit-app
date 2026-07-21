import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { OnboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'blog',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/blog/blog.component').then((m) => m.BlogComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/blog/blog-post-detail/blog-post-detail.component').then(
            (m) => m.BlogPostDetailComponent,
          ),
      },
    ],
  },
  {
    path: 'plans',
    loadComponent: () =>
      import('./features/workouts/workouts.component').then(
        (m) => m.WorkoutsComponent,
      ),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  // OnboardingGuard intentionally omitted — social and session routes
  // are accessible before onboarding completes per product decision.
  // Only /user-dashboard requires onboarding completion.
  // Affected routes: /workout-session/:templateId, /ai-assistant,
  //                  /account, /social
  {
    path: 'workout-session/:templateId',
    loadComponent: () =>
      import('./features/workouts/active-session/active-workout-session.component').then(
        (m) => m.ActiveWorkoutSessionComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'ai-assistant',
    loadComponent: () =>
      import('./features/openai/openai.component').then(
        (m) => m.OpenaiComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./features/user/user-page.component').then(
        (m) => m.UserPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'user-dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then(
        (m) => m.DashboardPageComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    canActivate: [GuestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
    canActivate: [GuestGuard],
  },

  {
    path: 'social',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/social/social.routes').then(m => m.SOCIAL_ROUTES),
  },

  // ── Onboarding flow (Fix 4) ───────────────────────────────────────────────
  {
    path: 'onboarding',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'carousel',
        loadComponent: () =>
          import('./features/onboarding/carousel/onboarding-carousel.component').then(
            (m) => m.OnboardingCarouselComponent,
          ),
      },
      {
        path: 'biometrics',
        loadComponent: () =>
          import('./features/onboarding/biometrics/onboarding-biometrics.component').then(
            (m) => m.OnboardingBiometricsComponent,
          ),
      },
      {
        path: 'your-numbers',
        loadComponent: () =>
          import('./features/onboarding/your-numbers/your-numbers-reveal.component').then(
            (m) => m.YourNumbersRevealComponent,
          ),
      },
      { path: '', redirectTo: 'carousel', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' },
];
