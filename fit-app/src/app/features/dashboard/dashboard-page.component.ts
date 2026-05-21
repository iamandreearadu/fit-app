import { Component, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { DailyUserDataComponent } from './daily-user-data/daily-user-data.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { PreviousDailyUserDataComponent } from './previous-daily-user-data/previous-daily-user-data.component';
import { UserStore } from '../../core/store/user.store';
import { OnboardingWizardComponent } from '../onboarding/onboarding-wizard.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [FooterComponent, HeaderComponent, DailyUserDataComponent, DashboardComponent, PreviousDailyUserDataComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly userStore = inject(UserStore);

  ngOnInit(): void {
    const user = this.userStore.user();
    if (user && !user.onboardingCompleted) {
      this.dialog.open(OnboardingWizardComponent, {
        disableClose: true,
        panelClass: 'onboarding-panel',
        maxWidth: '520px',
        width: '96vw',
      });
    }
  }
}
