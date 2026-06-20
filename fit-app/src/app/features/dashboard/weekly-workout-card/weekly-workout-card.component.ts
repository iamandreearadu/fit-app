import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { DayWorkoutDto, WeeklyWorkoutsDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-weekly-workout-card',
  standalone: true,
  imports: [RelativeTimePipe],
  templateUrl: './weekly-workout-card.component.html',
  styleUrl: './weekly-workout-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyWorkoutCardComponent {
  @Input() data: WeeklyWorkoutsDto | null = null;
  @Input() loading: boolean = false;

  readonly skeletonHeights = [40, 20, 36, 12, 28, 44, 16];

  get maxDuration(): number {
    const days = this.data?.days ?? [];
    const max = Math.max(...days.map(d => d.durationMinutes), 0);
    return max > 0 ? max : 1;
  }

  barHeight(day: DayWorkoutDto): number {
    if (day.durationMinutes <= 0) return 4;
    return Math.max(4, Math.min(48, (day.durationMinutes / this.maxDuration) * 48));
  }
}
