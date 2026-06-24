import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MaterialModule } from '../../../../core/material/material.module';
import { DashboardFacade } from '../../../../core/facade/dashboard.facade';

@Component({
  selector: 'app-water-card',
  standalone: true,
  imports: [DecimalPipe, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './water-card.component.html',
  styleUrls: ['./water-card.component.css'],
})
export class WaterCardComponent {
  readonly dashFacade = inject(DashboardFacade);
}
