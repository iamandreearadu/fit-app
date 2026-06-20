import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MaterialModule } from '../../../../core/material/material.module';
import { DashboardFacade } from '../../../../core/facade/dashboard.facade';

@Component({
  selector: 'app-calories-card',
  standalone: true,
  imports: [MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calories-card.component.html',
  styleUrls: ['./calories-card.component.css'],
})
export class CaloriesCardComponent {
  readonly dashFacade = inject(DashboardFacade);

  onCaloriesBurnedChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value || 0;
    this.dashFacade.caloriesBurned.set(Math.max(0, value));
  }
}
