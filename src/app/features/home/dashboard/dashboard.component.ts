import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  public UserFacade = inject(UserFacade);
  public todayDate = new Date().toISOString().slice(0,10)
}
