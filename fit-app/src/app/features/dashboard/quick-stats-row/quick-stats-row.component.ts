import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FitnessDataBlockComponent } from '../../../shared/components/fitness-data-block/fitness-data-block.component';

/** @deprecated Legacy interface — superseded by DashboardTodayDto fields */
interface QuickStatsDto {
  stepsCount: number;
  stepsGoal: number;
  waterConsumedL: number;
  waterTargetL: number;
  caloriesBurned: number;
}

@Component({
  selector: 'app-quick-stats-row',
  standalone: true,
  imports: [FitnessDataBlockComponent],
  templateUrl: './quick-stats-row.component.html',
  styleUrl: './quick-stats-row.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickStatsRowComponent {
  @Input() stats: QuickStatsDto | null = null;
  @Input() loading: boolean = false;
}
