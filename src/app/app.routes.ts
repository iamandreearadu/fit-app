import { Routes } from '@angular/router';
import { PageUserProfileComponent } from './features/user-profile/page-user-profile.component';
import { ParentComponent } from './features/composite-profile/parent.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { BlogComponent } from './features/blog/blog.component';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },

  { path: 'user-profile', component: PageUserProfileComponent, canActivate: [AuthGuard] },
  { path: 'parent/profile-user-data', component: ParentComponent, canActivate: [AuthGuard] },
  { path: 'blog', component: BlogComponent, canActivate: [AuthGuard] },

  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  // fallback
  { path: '**', redirectTo: '' },
];
