import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-user-fit-metrics',
  imports: [CommonModule],
  templateUrl: './user-fit-metrics.component.html',
  styleUrls: ['./user-fit-metrics.component.css'],
})
export class UserFitMetricsComponent {
  constructor(private facade: UserFacade) {}

  get metrics() {
    return this.facade.metrics;
  }
}
