import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  selector: 'app-daily-entry-calorie-summary',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  templateUrl: './daily-entry-calorie-summary.component.html',
  styleUrl: './daily-entry-calorie-summary.component.css',
})
export class DailyEntryCalorieSummaryComponent {
  protected readonly facade = inject(UserFacade);
}
