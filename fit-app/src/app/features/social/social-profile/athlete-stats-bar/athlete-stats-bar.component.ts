import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
@Component({
  selector: 'app-athlete-stats-bar',
  standalone: true,
  imports: [],
  templateUrl: './athlete-stats-bar.component.html',
  styleUrl: './athlete-stats-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AthleteStatsBarComponent {
  @Input() monthlyWorkouts: number = 0;
  @Input() followersCount: number = 0;
  @Input() followingCount: number = 0;
  @Input() mutualFollowersCount: number = 0;
  @Input() isOwnProfile: boolean = false;
  @Input() loading: boolean = false;
  @Output() followersClick = new EventEmitter<void>();
  @Output() followingClick = new EventEmitter<void>();
}
