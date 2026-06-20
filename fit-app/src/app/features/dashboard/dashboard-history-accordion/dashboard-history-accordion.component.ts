import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PreviousDailyUserDataComponent } from '../previous-daily-user-data/previous-daily-user-data.component';

@Component({
  selector: 'app-dashboard-history-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PreviousDailyUserDataComponent],
  templateUrl: './dashboard-history-accordion.component.html',
  styleUrl: './dashboard-history-accordion.component.css',
})
export class DashboardHistoryAccordionComponent {
  readonly isOpen = signal(false);
  toggle(): void { this.isOpen.update(v => !v); }
}
