import { Routes } from '@angular/router';
import { PageUserProfileComponent } from './features/user-profile/page-user-profile.component';
import { ParentComponent } from './features/composite-profile/parent.component';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  { path: 'page/user-profile', component: PageUserProfileComponent },
  { path: 'parent/profile-user-data', component: ParentComponent },
  { path: 'home', component: HomeComponent },
  { path: '', redirectTo: 'page/user-profile', pathMatch: 'full' },
  { path: '**', redirectTo: 'page/user-profile' },
];
