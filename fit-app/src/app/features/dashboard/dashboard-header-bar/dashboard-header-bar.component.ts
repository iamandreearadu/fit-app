import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StreakChipComponent } from '../streak-chip/streak-chip.component';
import { DashboardMetaDto, DashboardStreakDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard-header-bar',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatButtonModule, StreakChipComponent],
  templateUrl: './dashboard-header-bar.component.html',
  styleUrl: './dashboard-header-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHeaderBarComponent {
  @Input() meta: DashboardMetaDto | null = null;
  @Input() streak: DashboardStreakDto | null = null;
  @Input() avatarUrl: string | null = null;
  @Input() loading = false;
  @Input() hasUnreadNotifications = false;

  @Output() notificationsBellClick = new EventEmitter<void>();

  readonly today = new Date();

  get statusBadge(): string  { return this.meta?.statusBadge ?? ''; }

  get badgeClass(): string {
    switch (this.statusBadge) {
      case 'CUTTING':      return 'badge-cutting';
      case 'BULKING':      return 'badge-bulking';
      default:             return 'badge-maintenance';
    }
  }
}
