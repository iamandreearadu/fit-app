import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserFacade } from '../../../core/facade/user.facade';

/**
 * StreakBadgeComponent — Fix 5.
 *
 * Displays the current streak as a pill badge (flame icon + day count).
 * Reads only `UserFacade.streak()` — never calls API services directly.
 * Renders nothing when streak is 0 or null.
 *
 * Visual states:
 *   default      — purple pill, flame flicker animation
 *   at-risk      — amber pill + pulse animation (atRisk = true, after 18:00 UTC)
 *   new-record   — one-shot glow animation (isNewRecord transition false → true)
 *   bump         — one-shot count scale animation (streak increments via SignalR)
 */
@Component({
  selector: 'app-streak-badge',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './streak-badge.component.html',
  styleUrl: './streak-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StreakBadgeComponent {
  protected readonly userFacade = inject(UserFacade);

  /** One-shot new-record glow — active for 1.5 s on isNewRecord false→true transition */
  protected readonly isNewRecord = signal(false);
  /** One-shot count bump — active for 400 ms when streak.current increments */
  protected readonly isBumping = signal(false);

  // Tracking vars — plain properties, not reactive (avoids signal-in-effect concerns)
  private prevCount = 0;
  private prevIsNewRecord = false;
  private initialized = false;

  constructor() {
    // Single effect watches streak; defers signal writes to setTimeout so they
    // run outside the reactive context (no allowSignalWrites needed).
    effect(() => {
      const streak = this.userFacade.streak();
      const current = streak?.current ?? 0;
      const newRecord = streak?.isNewRecord ?? false;

      const wasInit = this.initialized;
      const prevCount = this.prevCount;
      const prevNewRecord = this.prevIsNewRecord;

      // Update tracking state (plain props — no reactive write)
      this.prevCount = current;
      this.prevIsNewRecord = newRecord;
      this.initialized = true;

      if (!wasInit) return; // skip initial load — animations fire on real-time updates only

      setTimeout(() => {
        // Bump animation: streak incremented via SignalR
        if (current > prevCount) {
          this.isBumping.set(true);
          setTimeout(() => this.isBumping.set(false), 400);
        }
        // New-record glow: isNewRecord flipped false → true
        if (newRecord && !prevNewRecord) {
          this.isNewRecord.set(true);
          setTimeout(() => this.isNewRecord.set(false), 1500);
        }
      }, 0);
    });
  }
}
