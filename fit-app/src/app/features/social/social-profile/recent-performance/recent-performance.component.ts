import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FitnessDataBlockComponent } from '../../../../shared/components/fitness-data-block/fitness-data-block.component';

@Component({
  selector: 'app-recent-performance',
  standalone: true,
  imports: [MatIconModule, FitnessDataBlockComponent],
  templateUrl: './recent-performance.component.html',
  styleUrl: './recent-performance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentPerformanceComponent {
  @Input() bestStreakDays: number | null = null;
  @Input() weeklyVolume: number | null = null;
  @Input() favouriteExercise: string | null = null;
  @Input() loading: boolean = false;

  get truncatedExercise(): string {
    const ex = this.favouriteExercise ?? '';
    return ex.length > 12 ? ex.slice(0, 12) + '…' : ex;
  }
}
