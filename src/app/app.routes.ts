import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { BlogComponent } from './features/blog/blog.component';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { UserPageComponent } from './features/user/user-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { HomePageComponent } from './features/home/home-page.component';

export const routes: Routes = [

  { path: '', component: HomePageComponent },
  { path: 'blog', component: BlogComponent },

  { path: 'user-profile', component: UserPageComponent, canActivate: [AuthGuard] },
  { path: 'user-dashboard', component: DashboardPageComponent, canActivate: [AuthGuard] },

  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  { path: '**', redirectTo: '' },
];
