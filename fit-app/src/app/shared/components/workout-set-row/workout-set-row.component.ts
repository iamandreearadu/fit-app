import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { LastExerciseSession } from '../../../core/models/workouts-tab.model';

export type SetRowState = 'idle' | 'editing' | 'completed' | 'deleting';

export interface CompletedSetPayload {
  weightKg: number;
  reps: number;
}

@Component({
  selector: 'app-workout-set-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MaterialModule],
  templateUrl: './workout-set-row.component.html',
  styleUrl: './workout-set-row.component.css',
})
export class WorkoutSetRowComponent implements OnInit {
  private readonly el = inject(ElementRef);

  @Input({ required: true }) setNumber!: number;
  @Input({ required: true }) exerciseName!: string;

  /** Target values from the workout template (pre-fill) */
  @Input() targetWeightKg = 0;
  @Input() targetReps = 12;

  /** Previous session data for ghost text */
  @Input() lastSession: LastExerciseSession | null = null;

  /** Emitted on swipe-right completion; parent starts rest timer */
  @Output() completed = new EventEmitter<CompletedSetPayload>();

  /** Emitted on swipe-left delete; parent shows undo toast */
  @Output() deleted = new EventEmitter<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  readonly state = signal<SetRowState>('idle');
  readonly weightKg = signal(0);
  readonly reps = signal(12);
  readonly translateX = signal(0);

  // ── Edit mode: separate input signals to avoid mid-edit signal churn ───────
  readonly editWeight = signal('');
  readonly editReps = signal('');

  // ── Swipe tracking ─────────────────────────────────────────────────────────
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerActive = false;
  private swipeBlocked = false; // block swipe if pointer moved vertically first
  // Stored so releasePointerCapture can be called in onPointerCancel, which
  // receives no event argument and therefore has no access to event.pointerId.
  private capturedPointerId: number | null = null;

  // ── Long-press tracking ────────────────────────────────────────────────────
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressThresholdMs = 400;
  private longPressMoved = false;

  ngOnInit(): void {
    this.weightKg.set(this.targetWeightKg);
    this.reps.set(Math.max(1, this.targetReps));
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get ghostText(): string | null {
    if (!this.lastSession) return null;
    return `last time: ${this.lastSession.lastWeightKg}kg × ${this.lastSession.lastReps}`;
  }

  get weightDisplay(): string {
    return this.weightKg().toFixed(1);
  }

  get isCompleted(): boolean {
    return this.state() === 'completed';
  }

  get isEditing(): boolean {
    return this.state() === 'editing';
  }

  // ── Stepper buttons ────────────────────────────────────────────────────────

  decrementWeight(event: Event): void {
    event.stopPropagation();
    if (this.isCompleted) return;
    this.weightKg.update(v => Math.max(0, parseFloat((v - 2.5).toFixed(1))));
  }

  incrementWeight(event: Event): void {
    event.stopPropagation();
    if (this.isCompleted) return;
    this.weightKg.update(v => parseFloat((v + 2.5).toFixed(1)));
  }

  decrementReps(event: Event): void {
    event.stopPropagation();
    if (this.isCompleted) return;
    this.reps.update(v => Math.max(1, v - 1));
  }

  incrementReps(event: Event): void {
    event.stopPropagation();
    if (this.isCompleted) return;
    this.reps.update(v => v + 1);
  }

  // ── Inline edit (long-press mode) ─────────────────────────────────────────

  enterEditMode(): void {
    if (this.isCompleted) return;
    this.editWeight.set(this.weightKg().toFixed(1));
    this.editReps.set(String(this.reps()));
    this.state.set('editing');
    if (navigator.vibrate) navigator.vibrate(25);
  }

  commitEdit(): void {
    const w = parseFloat(this.editWeight());
    const r = parseInt(this.editReps(), 10);
    if (!isNaN(w) && w >= 0) this.weightKg.set(parseFloat(w.toFixed(1)));
    if (!isNaN(r) && r >= 1) this.reps.set(r);
    this.state.set('idle');
  }

  onEditWeightChange(event: Event): void {
    this.editWeight.set((event.target as HTMLInputElement).value);
  }

  onEditRepsChange(event: Event): void {
    this.editReps.set((event.target as HTMLInputElement).value);
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.commitEdit();
  }

  // ── Accessible fallback: mark complete button (sr-only) ───────────────────

  markComplete(event: Event): void {
    event.stopPropagation();
    this.confirmComplete();
  }

  // ── Pointer events — swipe + long-press ──────────────────────────────────

  onPointerDown(event: PointerEvent): void {
    if (this.isCompleted || this.isEditing) return;

    // Capture all subsequent pointer events for this gesture to this element.
    // Without capture, if the pointer moves outside the component boundary before
    // pointerup fires (e.g. a long fast swipe), the pointerup event is delivered
    // to a different element and pointerActive stays true permanently — the row
    // becomes stuck in a translated, unresponsive state until navigation.
    this.el.nativeElement.setPointerCapture(event.pointerId);
    this.capturedPointerId = event.pointerId;

    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.pointerActive = true;
    this.swipeBlocked = false;
    this.longPressMoved = false;

    // Start long-press timer
    this.longPressTimer = setTimeout(() => {
      if (!this.longPressMoved) {
        this.enterEditMode();
      }
    }, this.longPressThresholdMs);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.pointerActive) return;

    const dx = event.clientX - this.pointerStartX;
    const dy = event.clientY - this.pointerStartY;

    // Cancel long-press if the pointer has moved more than 8px
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      this.longPressMoved = true;
      this.cancelLongPress();
    }

    // If vertical movement dominates first, block swipe for this gesture
    if (!this.swipeBlocked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      this.swipeBlocked = true;
    }

    if (this.swipeBlocked) return;

    this.translateX.set(dx);
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    // Release capture unconditionally — must happen before any early return
    // so the browser never holds a stale capture after this gesture ends.
    if (this.capturedPointerId !== null) {
      this.el.nativeElement.releasePointerCapture(this.capturedPointerId);
      this.capturedPointerId = null;
    }

    if (!this.pointerActive) return;
    this.pointerActive = false;
    this.cancelLongPress();

    if (this.swipeBlocked) {
      this.translateX.set(0);
      return;
    }

    const dx = this.translateX();

    if (dx >= 60) {
      this.confirmComplete();
    } else if (dx <= -60) {
      this.confirmDelete();
    } else {
      // Elastic snap back
      this.translateX.set(0);
    }
  }

  @HostListener('pointercancel')
  onPointerCancel(): void {
    // Release capture unconditionally — pointercancel receives no $event,
    // so we use the pointerId stored at pointerdown time.
    if (this.capturedPointerId !== null) {
      this.el.nativeElement.releasePointerCapture(this.capturedPointerId);
      this.capturedPointerId = null;
    }

    this.pointerActive = false;
    this.cancelLongPress();
    this.translateX.set(0);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private confirmComplete(): void {
    this.translateX.set(0);
    this.state.set('completed');
    this.completed.emit({ weightKg: this.weightKg(), reps: this.reps() });
  }

  private confirmDelete(): void {
    this.state.set('deleting');
    // Defer the deleted emission until the CSS collapse animation finishes.
    // Emitting synchronously would cause Angular to remove the host element
    // in the same change-detection pass that applies set-row--deleting,
    // killing the animation before it starts.
    // { once: true } auto-removes the listener — no manual cleanup needed.
    const host = this.el.nativeElement as HTMLElement;
    host.addEventListener('animationend', () => this.deleted.emit(), { once: true });
  }

  // ── Row transform style ────────────────────────────────────────────────────

  get rowTransform(): string {
    if (this.state() === 'deleting') return 'translateX(-110%)';
    return `translateX(${this.translateX()}px)`;
  }

  get rowTransition(): string {
    if (this.state() === 'completed') return 'transform 0.22s ease-out';
    if (this.state() === 'deleting') return 'transform 0.25s ease-in';
    if (!this.pointerActive) return 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
    return 'none';
  }

  // ── Reveal layer opacity ──────────────────────────────────────────────────

  get completeRevealOpacity(): number {
    const dx = this.translateX();
    return Math.min(1, Math.max(0, dx / 60));
  }

  get deleteRevealOpacity(): number {
    const dx = this.translateX();
    return Math.min(1, Math.max(0, -dx / 60));
  }
}
