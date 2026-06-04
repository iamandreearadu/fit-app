import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { SuggestedUser } from '../../../../core/models/social.model';
import { AlertService } from '../../../../shared/services/alert.service';

@Component({
  selector: 'app-social-feed-guided-empty',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './social-feed-guided-empty.component.html',
  styleUrl: './social-feed-guided-empty.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialFeedGuidedEmptyComponent implements OnInit {
  protected readonly facade = inject(SocialFacade);
  private readonly alerts = inject(AlertService);

  /** Set of userId strings that have been successfully followed in this session. */
  readonly followingSet = signal<Set<string>>(new Set());
  /** Set of userId strings whose follow API call is currently in-flight. */
  readonly pendingFollowSet = signal<Set<string>>(new Set());

  /** True when every suggested user has been followed in this session. */
  readonly allFollowed = computed(() => {
    const users = this.facade.suggestedUsers();
    return users.length > 0 && users.every(u => this.followingSet().has(u.userId));
  });

  readonly skeletons = Array.from({ length: 5 });

  ngOnInit(): void {
    this.facade.loadSuggestedUsers(5);
  }

  isFollowing(userId: string): boolean {
    return this.followingSet().has(userId);
  }

  isPending(userId: string): boolean {
    return this.pendingFollowSet().has(userId);
  }

  async follow(user: SuggestedUser): Promise<void> {
    const { userId } = user;
    if (this.isPending(userId) || this.isFollowing(userId)) return;

    this.pendingFollowSet.update(s => new Set([...s, userId]));
    try {
      const response = await this.facade.toggleFollow(userId);
      if (response.isFollowing) {
        this.followingSet.update(s => new Set([...s, userId]));
        this.facade.incrementMyFollowingCount();
      }
    } catch {
      this.alerts.error("Couldn't follow user. Please try again.");
    } finally {
      this.pendingFollowSet.update(s => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  }

  /** Returns two initials for the user's display name. */
  getInitials(displayName: string): string {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] ?? '') + (parts[1][0] ?? '');
    }
    return displayName.slice(0, 2);
  }

  /** Returns the goal-badge CSS modifier class. */
  getGoalBadgeClass(fitnessGoal: SuggestedUser['fitnessGoal']): string {
    if (!fitnessGoal) return 'pill-subtle';
    const map: Record<string, string> = {
      lose: 'pill-goal-lose',
      gain: 'pill-goal-gain',
      maintain: 'pill-goal-maintain',
    };
    return map[fitnessGoal.toLowerCase()] ?? 'pill-subtle';
  }

  /** Returns display text for the goal badge. */
  getGoalLabel(fitnessGoal: SuggestedUser['fitnessGoal']): string {
    if (!fitnessGoal) return 'Fitness';
    const map: Record<string, string> = {
      lose: 'Lose Wt',
      gain: 'Gain',
      maintain: 'Maintain',
    };
    return map[fitnessGoal.toLowerCase()] ?? fitnessGoal;
  }
}
