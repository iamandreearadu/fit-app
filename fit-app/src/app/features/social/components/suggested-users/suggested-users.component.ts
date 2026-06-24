import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { AlertService } from '../../../../shared/services/alert.service';
import { SuggestedUser } from '../../../../core/models/social.model';

@Component({
  selector: 'app-suggested-users',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule, LowerCasePipe],
  templateUrl: './suggested-users.component.html',
  styleUrl: './suggested-users.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedUsersComponent implements OnInit {
  private readonly facade = inject(SocialFacade);
  private readonly alerts = inject(AlertService);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly users     = signal<SuggestedUser[]>([]);
  readonly loading   = signal(true);
  readonly following = signal<Set<string>>(new Set());
  readonly pending   = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadSuggestions();
  }

  private async loadSuggestions(): Promise<void> {
    this.loading.set(true);
    try {
      await this.facade.loadSuggestedUsers(5);
      this.users.set(this.facade.suggestedUsers());
    } catch {
      // Non-critical — swallow silently; Discover page content still shows
      console.warn('[SuggestedUsersComponent] Failed to load suggested users');
    } finally {
      this.loading.set(false);
    }
  }

  isFollowing(userId: string): boolean {
    return this.following().has(userId);
  }

  isPending(userId: string): boolean {
    return this.pending().has(userId);
  }

  // Suggested panel is follow-only — unfollow is available from the user's profile page.
  async onFollow(userId: string): Promise<void> {
    if (this.isPending(userId) || this.isFollowing(userId)) return;

    this.pending.update(s => new Set([...s, userId]));
    try {
      const response = await this.facade.toggleFollow(userId);
      if (response.isFollowing) {
        this.following.update(s => new Set([...s, userId]));
        this.facade.incrementMyFollowingCount();
      }
    } catch {
      this.alerts.error("Couldn't follow user. Please try again.");
    } finally {
      this.pending.update(s => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  }

  goalLabel(goal: string): string {
    const map: Record<string, string> = {
      lose:     'Lose weight',
      gain:     'Build muscle',
      maintain: 'Maintain',
      strength: 'Strength',
      cardio:   'Cardio',
    };
    return map[goal.toLowerCase()] ?? goal;
  }
}
