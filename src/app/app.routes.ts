import { Routes } from '@angular/router';
import { PageUserProfileComponent } from './features/user-profile/page-user-profile.component';
import { ParentComponent } from './features/composite-profile/parent.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './core/components/login/login.component';
import { RegisterComponent } from './core/components/register/register.component';
import { AuthenticationGuard } from './core/guards/authentication.guard';
import { BlogComponent } from './features/blog/blog.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'page/user-profile', component: PageUserProfileComponent, canActivate: [AuthenticationGuard], data: { allowed: true } },
  { path: 'parent/profile-user-data', component: ParentComponent, canActivate: [AuthenticationGuard], data: { allowed: true } },
  { path: 'blog', component: BlogComponent, canActivate: [AuthenticationGuard], data: { allowed: true }},
  { path: 'login', component: LoginComponent, canActivate: [AuthenticationGuard], data: { allowed: false } },
  { path: 'register', component: RegisterComponent, canActivate: [AuthenticationGuard], data: { allowed: false } },
  { path: '', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
