import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-fitness-metrics',
  imports: [CommonModule, MaterialModule],
  templateUrl: './fitness-metrics.component.html',
  styleUrl: './fitness-metrics.component.css'
})
export class FitnessMetricsComponent {
  public facade = inject(UserFacade);
  public metrics = this.facade.metrics;
}
