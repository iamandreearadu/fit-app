import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { DailyUserDataComponent } from './daily-user-data/daily-user-data.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { PreviousDailyUserDataComponent } from './previous-daily-user-data/previous-daily-user-data.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [FooterComponent, HeaderComponent, DailyUserDataComponent, DashboardComponent,PreviousDailyUserDataComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {

}
