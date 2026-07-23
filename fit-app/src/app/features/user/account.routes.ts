import { Routes } from '@angular/router';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'my-account',
  },
  {
    path: 'my-account',
    loadComponent: () =>
      import('./profile-tab/profile-tab.component').then((m) => m.ProfileTabComponent),
  },
  {
    path: 'profile',
    redirectTo: 'my-account',
  },
  {
    path: 'physical',
    loadComponent: () =>
      import('./physical-tab/physical-tab.component').then((m) => m.PhysicalTabComponent),
  },
  {
    path: 'workouts',
    loadComponent: () =>
      import('./workouts-tab/workouts-tab.component').then((m) => m.WorkoutsTabComponent),
  },
  {
    path: 'nutrition',
    loadComponent: () =>
      import('./nutrition-tab/nutrition-tab.component').then((m) => m.NutritionTabComponent),
  },
  {
    path: 'progress',
    loadComponent: () =>
      import('./progress-tab/progress-tab.component').then((m) => m.ProgressTabComponent),
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./goals-tab/goals-tab.component').then((m) => m.GoalsTabComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings-tab/settings-tab.component').then((m) => m.SettingsTabComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications-tab/notifications-tab.component').then((m) => m.NotificationsTabComponent),
  },
  {
    path: '**',
    redirectTo: 'my-account',
  },
];
