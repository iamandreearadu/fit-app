import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocialProfileFacade } from '../../../../core/facade/social-profile.facade';
import { UserPublicStats } from '../../../../core/models/stats.model';

@Component({
  selector: 'app-stats-tab',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule],
  templateUrl: './stats-tab.component.html',
  styleUrl: './stats-tab.component.css'
})
export class StatsTabComponent implements OnChanges {
  @Input() isOwnProfile = false;
  @Input() userId = '';

  protected readonly facade = inject(SocialProfileFacade);
  readonly stats = signal<UserPublicStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private requestVersion = 0;

  readonly days = computed(() => this.stats()?.weeklyVolumes ?? []);
  readonly activeDays = computed(() => this.days().filter(day => day.volumeKg > 0).length);
  readonly recentActivities = computed(() => this.stats()?.recentWorkouts ?? []);
  readonly consistency = computed(() => Math.round((this.activeDays() / 7) * 100));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId']) void this.loadStats();
  }

  retryLoadStats(): void {
    void this.loadStats();
  }

  dayLetter(value: string): string {
    return new Intl.DateTimeFormat('en', { weekday: 'narrow', timeZone: 'UTC' })
      .format(new Date(`${value}T00:00:00Z`));
  }

  activityLabel(value: string): string {
    return value.startsWith('workout:') ? 'Saved workout' : value;
  }

  activityIcon(value: string): string {
    const activity = value.toLowerCase();
    if (activity.includes('run') || activity.includes('cardio')) return 'directions_run';
    if (activity.includes('yoga') || activity.includes('pilates')) return 'self_improvement';
    return 'fitness_center';
  }

  private async loadStats(): Promise<void> {
    const requestedUserId = this.userId.trim();
    const version = ++this.requestVersion;
    this.stats.set(null);
    this.error.set(null);
    if (!requestedUserId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    await this.facade.loadPublicStats(requestedUserId);
    if (version !== this.requestVersion || requestedUserId !== this.userId.trim()) return;
    this.stats.set(this.facade.publicStats());
    this.error.set(this.facade.publicStatsError());
    this.loading.set(false);
  }
}
