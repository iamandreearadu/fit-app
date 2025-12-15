import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { BlogComponent } from './features/blog/blog.component';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { UserPageComponent } from './features/user/user-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { HomePageComponent } from './features/home/home-page.component';
import { OpenaiComponent } from './features/openai/openai.component';
import { BlogPostDetailComponent } from './features/blog/blog-post-detail/blog-post-detail.component';

export const routes: Routes = [

  { path: '', component: HomePageComponent },
  { path: 'blog', 
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
        .then(m => m.BlogPostDetailComponent  )
      }
    ]
  },
  { path: 'openai', component: OpenaiComponent },

  { path: 'user-profile', component: UserPageComponent, canActivate: [AuthGuard] },
  { path: 'user-dashboard', component: DashboardPageComponent, canActivate: [AuthGuard] },

  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  { path: '**', redirectTo: '' },
];
