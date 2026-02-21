import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const routes: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component')
      .then(m => m.HomePageComponent)
  },
  {
    path: 'blog',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/blog/blog.component')
          .then(m => m.BlogComponent)
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/blog/blog-post-detail/blog-post-detail.component')
          .then(m => m.BlogPostDetailComponent)
      }
    ]
  },
  {
    path: 'workouts',
    loadComponent: () =>
      import('./features/workouts/workouts.component')
      .then(m => m.WorkoutsComponent)
  },
  {
    path: 'openai',
    loadComponent: () =>
      import('./features/openai/openai.component')
      .then(m => m.OpenaiComponent)
  },
  {
    path: 'user-profile',
    loadComponent: () =>
      import('./features/user/user-page.component')
      .then(m => m.UserPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'user-dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component')
      .then(m => m.DashboardPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
      .then(m => m.LoginComponent),
    canActivate: [GuestGuard]
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component')
      .then(m => m.RegisterComponent),
    canActivate: [GuestGuard]
  },

  { path: '**', redirectTo: '' },
];