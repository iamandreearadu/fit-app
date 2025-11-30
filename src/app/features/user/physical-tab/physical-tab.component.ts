import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { PhysicalStatsComponent } from '../physical-stats/physical-stats.component';
import { FitnessMetricsComponent } from '../fitness-metrics/fitness-metrics.component';

@Component({
  standalone: true,
  selector: 'app-physical-tab',
  imports: [CommonModule, MaterialModule, PhysicalStatsComponent, FitnessMetricsComponent],
  templateUrl: './physical-tab.component.html',
  styleUrl: './physical-tab.component.css'
})
export class PhysicalTabComponent {
}
