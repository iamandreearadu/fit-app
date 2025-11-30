import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public facade = inject(UserFacade);

  public metrics = this.facade.metrics;
  public user = this.facade.user;
}
