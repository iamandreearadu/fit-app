import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { WorkoutCompletionSummary } from '../../../../core/models/workouts-tab.model';
import { ShareToSocialBottomSheetComponent } from '../../../../shared/components/share-to-social-bottom-sheet/share-to-social-bottom-sheet.component';
import { ShareToSocialData } from '../../../../core/models/social.model';

@Component({
  selector: 'app-workout-completion-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './workout-completion-card.component.html',
  styleUrl: './workout-completion-card.component.css',
})
export class WorkoutCompletionCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) summary!: WorkoutCompletionSummary;
  @Output() dismissed = new EventEmitter<void>();

  private readonly bottomSheet = inject(MatBottomSheet);

  // ── Streak counter animation ──────────────────────────────────────────────
  readonly streakDisplay = signal(0);
  private streakInterval: ReturnType<typeof setInterval> | null = null;

  // ── Dismiss animation state ───────────────────────────────────────────────
  readonly isDismissing = signal(false);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Swipe-to-dismiss state ────────────────────────────────────────────────
  private pointerStartY = 0;
  private pointerCurrentY = 0;
  readonly cardTranslateY = signal(0);

  ngOnInit(): void {
    this.animateStreak(this.summary.streakDay);
  }

  ngOnDestroy(): void {
    if (this.streakInterval) clearInterval(this.streakInterval);
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
  }

  // ── Keyboard dismiss ───────────────────────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  // ── Dismiss logic ──────────────────────────────────────────────────────────
  dismiss(): void {
    if (this.isDismissing()) return;
    this.isDismissing.set(true);
    this.dismissTimer = setTimeout(() => {
      this.dismissed.emit();
    }, 270); // matches animation-duration 0.25s + small buffer
  }

  // ── Swipe gesture (mobile only) ────────────────────────────────────────────
  onPointerDown(event: PointerEvent): void {
    this.pointerStartY = event.clientY;
    this.pointerCurrentY = event.clientY;
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointerStartY) return;
    const delta = event.clientY - this.pointerStartY;
    if (delta > 0) {
      this.cardTranslateY.set(delta);
    }
  }

  onPointerUp(): void {
    if (this.cardTranslateY() > 80) {
      this.dismiss();
    } else {
      this.cardTranslateY.set(0);
    }
    this.pointerStartY = 0;
  }

  // ── Share — opens ShareToSocialBottomSheetComponent (Fix 2) ──────────────
  onShare(): void {
    // PRIVACY: estimatedCaloriesKcal intentionally excluded from ShareToSocialData
    const shareData: ShareToSocialData = {
      type: 'workout',
      sessionId: this.summary.sessionId,
      templateTitle: this.summary.templateTitle,
      durationMin: this.summary.durationMin,
      exerciseCount: this.summary.exerciseCount,
    };
    this.bottomSheet.open(ShareToSocialBottomSheetComponent, {
      data: shareData,
      panelClass: 'share-sheet-panel',
      hasBackdrop: true,
    });
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  get formattedDate(): string {
    const d = new Date(this.summary.completedAt);
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${weekday}, ${day} ${month} ${year} · ${time}`;
  }

  get caloriesLabel(): string {
    return this.summary.estimatedCaloriesKcal === 0
      ? '—'
      : `~${this.summary.estimatedCaloriesKcal}`;
  }

  get motivationalCopy(): string {
    const day = this.summary.streakDay;
    if (day === 0) return "Log today's entry to start your streak!";
    if (day === 1) return "Great start — one day down!";
    if (day >= 2 && day < 7) return "Keep going — you're building momentum!";
    if (day === 7) return "One week streak — you're consistent! 🎯";
    if (day > 7 && day < 30) return "You're on fire! Keep the streak alive.";
    return `Incredible — ${day} days strong! 🏆`;
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private animateStreak(target: number): void {
    if (target <= 0) {
      this.streakDisplay.set(0);
      return;
    }
    const stepMs = Math.max(30, Math.floor(1200 / Math.max(target, 1)));
    let current = 0;
    this.streakInterval = setInterval(() => {
      current++;
      this.streakDisplay.set(current);
      if (current >= target) {
        clearInterval(this.streakInterval!);
        this.streakInterval = null;
      }
    }, stepMs);
  }
}
