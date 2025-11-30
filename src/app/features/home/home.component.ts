import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DashboardComponent } from "./dashboard/dashboard.component";
import { DailyUserDataComponent } from './daily-user-data/daily-user-data.component';
import { HeaderComponent } from '../../shared/components/header.component';
import { AccountFacade } from '../../core/facade/account.facade';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, DashboardComponent,DailyUserDataComponent, HeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  public accountFacade = inject(AccountFacade);
}
