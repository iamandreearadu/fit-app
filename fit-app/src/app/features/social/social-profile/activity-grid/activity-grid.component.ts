import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { PostGridItemDto } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-activity-grid',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, RelativeTimePipe],
  templateUrl: './activity-grid.component.html',
  styleUrl: './activity-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityGridComponent {
  @Input() items: PostGridItemDto[] = [];
  @Input() hasMore: boolean = false;
  @Input() loading: boolean = false;
  @Output() loadMore = new EventEmitter<void>();

  viewMode = signal<'grid' | 'list'>('grid');

  readonly skeletonCells = Array.from({ length: 9 });
  readonly skeletonRows = Array.from({ length: 5 });

  getWorkoutIcon(workoutType: string | null): string {
    return 'fitness_center';
  }
}
