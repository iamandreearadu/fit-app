import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../core/material/material.module';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ProfileTabComponent } from './profile-tab/profile-tab.component';
import { PhysicalTabComponent } from './physical-tab/physical-tab.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AccountFacade } from '../../core/facade/account.facade';
import { UserStore } from '../../core/store/user.store';
import { WorkoutsTabComponent } from './workouts-tab/workouts-tab.component';
import { NutritionTabComponent } from './nutrition-tab/nutrition-tab.component';
import { UserFacade } from '../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-user-page',
  imports: [CommonModule, RouterModule, MaterialModule, HeaderComponent, ProfileTabComponent, PhysicalTabComponent,WorkoutsTabComponent, NutritionTabComponent,FooterComponent],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.css'
})
export class UserPageComponent implements OnInit {
  public accountFacade = inject(AccountFacade);
  public userStore = inject(UserStore);
  private userFacade = inject(UserFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public streak = this.userFacade.streak;

  private static readonly VALID_TABS = [
    'profile', 'physical', 'workouts', 'nutrition',
    'progress', 'goals', 'settings', 'notifications',
  ] as const;

  ngOnInit(): void {
    this.userFacade.loadStreak();

    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam && (UserPageComponent.VALID_TABS as readonly string[]).includes(tabParam)) {
      this.activeTab = tabParam as typeof this.activeTab;
    }
  }

  activeTab: 'profile' | 'physical' | 'workouts' | 'nutrition' | 'progress' | 'goals' | 'settings' | 'notifications' = 'profile';
  sidebarCollapsed = false;

  public avatarUrl = computed(() => {
    const user = this.userStore.user();
    return user?.imageUrl || 'assets/user.png';
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

  openAiHistory(): void {
    this.router.navigate(['/ai-assistant']);
  }
}
