import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../core/material/material.module';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ProfileTabComponent } from './profile-tab/profile-tab.component';
import { PhysicalTabComponent } from './physical-tab/physical-tab.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AccountFacade } from '../../core/facade/account.facade';
import { UserStore } from '../../core/store/user.store';
import { WorkoutsTabComponent } from './workouts-tab/workouts-tab.component';

@Component({
  standalone: true,
  selector: 'app-user-page',
  imports: [CommonModule, RouterModule, MaterialModule, HeaderComponent, ProfileTabComponent, PhysicalTabComponent,WorkoutsTabComponent, FooterComponent],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.css'
})
export class UserPageComponent {
  public accountFacade = inject(AccountFacade);
  public userStore = inject(UserStore);

  activeTab: 'profile' | 'physical' | 'workouts' | 'nutrition' | 'progress' | 'goals' | 'settings' | 'notifications' = 'profile';
  sidebarCollapsed = false;

  public avatarUrl = computed(() => {
    const user = this.userStore.user();
    return user?.imageUrl ;
  });

  public displayName = computed(() => {
    const user = this.userStore.user();
    return user?.fullName || this.accountFacade.authUser()?.fullName || 'User';
  });

  public displayEmail = computed(() => {
    const user = this.userStore.user();
    return user?.email || this.accountFacade.authUser()?.email || '';
  });

  setActiveTab(tab: 'profile' | 'physical' | 'workouts' | 'nutrition' | 'progress' | 'goals' | 'settings' | 'notifications') {
    this.activeTab = tab;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
