import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { ActivityItem } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-recent-activity-feed',
  standalone: true,
  imports: [RouterLink, MatIconModule, RelativeTimePipe],
  templateUrl: './recent-activity-feed.component.html',
  styleUrl: './recent-activity-feed.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentActivityFeedComponent {
  @Input() activities: ActivityItem[] = [];
  @Input() loading: boolean = false;
  @Output() seeAllClick = new EventEmitter<void>();

  readonly skeletonRows = Array.from({ length: 5 });

  getIcon(type: ActivityItem['type']): string {
    const icons: Record<ActivityItem['type'], string> = {
      workout: 'fitness_center',
      meal: 'restaurant',
      weight: 'monitor_weight',
      water: 'water_drop',
    };
    return icons[type];
  }

  getIconColor(type: ActivityItem['type']): string {
    const colors: Record<ActivityItem['type'], string> = {
      workout: 'var(--nova-primary)',
      meal: 'var(--nova-success)',
      weight: 'var(--nova-info)',
      water: 'var(--nova-info)',
    };
    return colors[type];
  }
}
