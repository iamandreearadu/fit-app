import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CompleteDayItem, CompleteStreakStatusDto } from '../../../../core/models/progress.model';

@Component({
  selector: 'app-complete-streak-hero',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './complete-streak-hero.component.html',
  styleUrl: './complete-streak-hero.component.css',
})
export class CompleteStreakHeroComponent {
  @Input({ required: true }) status!: CompleteStreakStatusDto;
  readonly items: Array<{ key: CompleteDayItem; label: string; icon: string }> = [
    { key: 'meals', label: 'Meals', icon: 'restaurant' },
    { key: 'activity', label: 'Activity', icon: 'fitness_center' },
    { key: 'steps', label: 'Steps', icon: 'directions_walk' },
    { key: 'water', label: 'Water', icon: 'water_drop' },
  ];

  completed(item: CompleteDayItem): boolean {
    return !this.status.missingToday.includes(item);
  }

  get ringProgress(): number {
    return Math.min(Math.max(this.status.completeDayStreak, 0), 7);
  }
}
