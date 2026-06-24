import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';

@Component({
  selector: 'app-rings-hero',
  standalone: true,
  imports: [CommonModule, MatIconModule, ProgressRingComponent],
  templateUrl: './rings-hero.component.html',
  styleUrl: './rings-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RingsHeroComponent {
  @Input() caloriesConsumed: number = 0;
  @Input() caloriesTarget: number = 2000;
  @Input() proteinConsumedG: number = 0;
  @Input() proteinTargetG: number = 150;
  @Input() workoutsThisWeek: number = 0;
  @Input() workoutsWeeklyTarget: number = 3;
  @Input() currentStreak: number = 0;
  @Input() loggedToday: boolean = false;
  @Input() loading: boolean = false;

  get caloriesProgress(): number { return this.caloriesTarget > 0 ? Math.min(this.caloriesConsumed / this.caloriesTarget, 1) : 0; }
  get proteinProgress(): number { return this.proteinTargetG > 0 ? Math.min(this.proteinConsumedG / this.proteinTargetG, 1) : 0; }
  get workoutsProgress(): number { return this.workoutsWeeklyTarget > 0 ? Math.min(this.workoutsThisWeek / this.workoutsWeeklyTarget, 1) : 0; }
  get caloriesRemaining(): number { return Math.max(0, this.caloriesTarget - this.caloriesConsumed); }
  get caloriesOver(): number { return Math.max(0, this.caloriesConsumed - this.caloriesTarget); }
  get goalsOnTrack(): number {
    return (this.caloriesProgress >= 0.8 ? 1 : 0) + (this.proteinProgress >= 0.8 ? 1 : 0) + (this.workoutsProgress >= 1.0 ? 1 : 0);
  }
  get allComplete(): boolean { return this.goalsOnTrack === 3; }
  get isNewUser(): boolean { return this.caloriesConsumed === 0 && this.proteinConsumedG === 0 && this.workoutsThisWeek === 0; }
  get completionLabel(): string {
    if (this.isNewUser) return 'Log your first entry';
    if (this.allComplete) return 'Day Complete!';
    return `${this.goalsOnTrack}/3 goals on track`;
  }
}
