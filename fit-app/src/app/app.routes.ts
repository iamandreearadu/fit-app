import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { analyzeMealExitGuard } from './features/dashboard/analyze-meal-page/analyze-meal-exit.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { OnboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    data: {
      meta: {
        title: 'NovaFit — Fitness, Nutrition & Progress',
        description: 'Track workouts, meals, hydration and progress with AI-assisted nutrition insights and a supportive fitness community.',
        index: true,
      },
    },
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
        data: {
          meta: {
            title: 'Fitness & Nutrition Articles | NovaFit',
            description: 'Practical fitness, workout and nutrition articles from NovaFit.',
            index: true,
          },
        },
        loadComponent: () =>
          import('./features/blog/blog.component').then((m) => m.BlogComponent),
      },
      {
        path: ':id',
        data: {
          meta: {
            title: 'Fitness Article | NovaFit',
            description: 'Read fitness, workout and nutrition guidance from NovaFit.',
            index: true,
          },
        },
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
    loadChildren: () =>
      import('./features/user/account.routes').then(
        (m) => m.ACCOUNT_ROUTES,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'user-dashboard/analyze-meal',
    loadComponent: () =>
      import('./features/dashboard/analyze-meal-page/analyze-meal-page.component').then(
        (m) => m.AnalyzeMealPageComponent,
      ),
    canActivate: [AuthGuard],
    canDeactivate: [analyzeMealExitGuard],
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
    data: { meta: { title: 'Log in | NovaFit', index: false } },
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    canActivate: [GuestGuard],
  },
  {
    path: 'register',
    data: { meta: { title: 'Create your NovaFit account', index: false } },
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
    canActivate: [GuestGuard],
  },
  {
    path: 'forgot-password',
    data: { meta: { title: 'Reset your password | NovaFit', index: false } },
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    data: { meta: { title: 'Choose a new password | NovaFit', index: false } },
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/legal-page.component').then(
        (m) => m.LegalPageComponent,
      ),
    data: {
      document: 'privacy',
      meta: {
        title: 'Privacy Policy | NovaFit',
        description: 'Learn how NovaFit collects, uses and protects your information.',
        index: true,
      },
    },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/legal/legal-page.component').then(
        (m) => m.LegalPageComponent,
      ),
    data: {
      document: 'terms',
      meta: {
        title: 'Terms of Service | NovaFit',
        description: 'Read the terms that govern your use of NovaFit.',
        index: true,
      },
    },
  },
  {
    path: 'cookies',
    loadComponent: () =>
      import('./features/legal/legal-page.component').then(
        (m) => m.LegalPageComponent,
      ),
    data: {
      document: 'cookies',
      meta: {
        title: 'Cookie Policy | NovaFit',
        description: 'Learn how NovaFit uses cookies and similar browser technologies.',
        index: true,
      },
    },
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
