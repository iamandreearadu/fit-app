import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';
import { AlertService } from '../../../shared/services/alert.service';
import { WorkoutSetRowComponent, CompletedSetPayload } from '../../../shared/components/workout-set-row/workout-set-row.component';
import { CompletedSet, WorkoutExercise } from '../../../core/models/workouts-tab.model';
import { WorkoutCompletionCardComponent } from './workout-completion-card/workout-completion-card.component';

// Rest timer duration options in seconds
const REST_DURATIONS = [30, 60, 90, 120, 180, 300] as const;
type RestDuration = (typeof REST_DURATIONS)[number];

interface ExerciseSetEntry {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

interface ExerciseSection {
  exercise: WorkoutExercise;
  sets: ExerciseSetEntry[];
}

@Component({
  selector: 'app-active-workout-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MaterialModule, WorkoutSetRowComponent, WorkoutCompletionCardComponent],
  templateUrl: './active-workout-session.component.html',
  styleUrl: './active-workout-session.component.css',
})
export class ActiveWorkoutSessionComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly facade = inject(WorkoutsTabFacade);
  private readonly alerts = inject(AlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── Session metadata ───────────────────────────────────────────────────────
  readonly templateTitle = signal('');
  readonly templateId = signal(0);
  readonly startedAt = new Date();
  readonly elapsedLabel = signal('00:00');

  // ── Exercise sections ──────────────────────────────────────────────────────
  readonly sections = signal<ExerciseSection[]>([]);

  // ── Rest timer ─────────────────────────────────────────────────────────────
  readonly restTimerVisible = signal(false);
  readonly restRemaining = signal(0);
  readonly restDuration = signal<RestDuration>(90);
  readonly restDurationChosen = signal(false); // once user picks duration, hide selector
  readonly restDurations: readonly RestDuration[] = REST_DURATIONS;

  readonly restFillPct = computed(() => {
    const dur = this.restDuration();
    const rem = this.restRemaining();
    return dur > 0 ? (rem / dur) * 100 : 0;
  });

  readonly restLabel = computed(() => {
    const s = this.restRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  readonly restWarning = computed(() => this.restRemaining() <= 10 && this.restRemaining() > 0);

  // ── Finish confirm overlay ─────────────────────────────────────────────────
  readonly showFinishConfirm = signal(false);
  readonly finishing = signal(false);

  // ── Loading ────────────────────────────────────────────────────────────────
  readonly loading = signal(true);

  // ── Computed: completion state ─────────────────────────────────────────────
  readonly totalSets = computed(() =>
    this.sections().reduce((acc, s) => acc + s.sets.length, 0)
  );

  readonly completedSets = computed(() =>
    this.sections().reduce((acc, s) => acc + s.sets.filter(r => r.completed).length, 0)
  );

  readonly allComplete = computed(
    () => this.totalSets() > 0 && this.completedSets() === this.totalSets()
  );

  // ── Timers (cleared on destroy) ────────────────────────────────────────────
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;
  private restInterval: ReturnType<typeof setInterval> | null = null;

  // ── Section tracking for UI (set key → section index) ─────────────────────
  getSectionSetsCompleted(section: ExerciseSection): number {
    return section.sets.filter(s => s.completed).length;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('templateId'));
    this.templateId.set(id);

    // Load template + last session data in parallel
    await Promise.all([
      this.facade.getTemplate(String(id)),
      this.facade.loadLastSession(id),
    ]);

    const template = this.facade.selectedTemplate;
    if (!template) {
      this.alerts.error('Workout not found.');
      this.router.navigate(['/plans']);
      return;
    }

    this.templateTitle.set(template.title);

    // Build exercise sections from template exercises
    const exercises = template.type === 'Cardio' ? [] : (template.exercises ?? []);
    const lastMap = this.facade.lastSessionMap();

    this.sections.set(
      exercises.map(ex => {
        const last = lastMap.get(ex.name) ?? null;
        const sets: ExerciseSetEntry[] = Array.from({ length: Math.max(1, ex.sets) }, (_, i) => ({
          setNumber: i + 1,
          weightKg: last ? last.lastWeightKg : ex.weightKg,
          reps: last ? last.lastReps : ex.reps,
          completed: false,
        }));
        return { exercise: ex, sets };
      })
    );

    this.loading.set(false);

    // Start elapsed timer
    this.elapsedInterval = setInterval(() => {
      const diff = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
      this.elapsedLabel.set(this.formatElapsed(diff));
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.elapsedInterval) clearInterval(this.elapsedInterval);
    if (this.restInterval) clearInterval(this.restInterval);
  }

  // ── Set row event handlers ─────────────────────────────────────────────────

  onSetCompleted(
    sectionIdx: number,
    setIdx: number,
    payload: CompletedSetPayload
  ): void {
    this.sections.update(sections => {
      const copy = sections.map((s, si) =>
        si === sectionIdx
          ? {
              ...s,
              sets: s.sets.map((row, ri) =>
                ri === setIdx
                  ? { ...row, weightKg: payload.weightKg, reps: payload.reps, completed: true }
                  : row
              ),
            }
          : s
      );
      return copy;
    });

    this.startRestTimer();
  }

  onSetDeleted(sectionIdx: number, setIdx: number): void {
    // Remove the row from state — undo handled by the alert toast
    this.sections.update(sections => {
      const copy = sections.map((s, si) =>
        si === sectionIdx
          ? { ...s, sets: s.sets.filter((_, ri) => ri !== setIdx).map((row, ri) => ({ ...row, setNumber: ri + 1 })) }
          : s
      );
      return copy;
    });

    // Show undo toast (3-second window — AlertService shows action toast)
    this.alerts.info('Set removed');
  }

  addSet(sectionIdx: number): void {
    this.sections.update(sections => {
      const copy = [...sections];
      const section = { ...copy[sectionIdx] };
      const lastSet = section.sets[section.sets.length - 1];
      const newSet: ExerciseSetEntry = {
        setNumber: section.sets.length + 1,
        weightKg: lastSet?.weightKg ?? section.exercise.weightKg,
        reps: lastSet?.reps ?? section.exercise.reps,
        completed: false,
      };
      section.sets = [...section.sets, newSet];
      copy[sectionIdx] = section;
      return copy;
    });
  }

  // ── Rest timer ─────────────────────────────────────────────────────────────

  setRestDuration(dur: RestDuration): void {
    this.restDuration.set(dur);
    this.restDurationChosen.set(true);  // hide selector once user has made a choice
    this.restRemaining.set(dur);         // apply new duration to the running countdown immediately
  }

  private startRestTimer(): void {
    // restDurationChosen is intentionally NOT set here so the duration selector
    // remains visible during the first rest, letting the user pick their preference.
    // It is set to true either when the user taps a duration (setRestDuration)
    // or when the first rest expires without a selection (timer callback below).
    this.stopRestTimer();
    this.restRemaining.set(this.restDuration());
    this.restTimerVisible.set(true);

    this.restInterval = setInterval(() => {
      const remaining = this.restRemaining() - 1;
      if (remaining <= 0) {
        this.restDurationChosen.set(true);  // hide selector for all subsequent rests
        this.stopRestTimer();
        this.restTimerVisible.set(false);
      } else {
        this.restRemaining.set(remaining);
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  skipRest(): void {
    this.stopRestTimer();
    this.restTimerVisible.set(false);
  }

  addRestTime(): void {
    this.restRemaining.update(v => v + 30);
  }

  private stopRestTimer(): void {
    if (this.restInterval) {
      clearInterval(this.restInterval);
      this.restInterval = null;
    }
  }

  // ── Finish workout ─────────────────────────────────────────────────────────

  openFinishConfirm(): void {
    this.showFinishConfirm.set(true);
  }

  cancelFinish(): void {
    this.showFinishConfirm.set(false);
  }

  async confirmFinish(): Promise<void> {
    this.finishing.set(true);
    this.showFinishConfirm.set(false);

    const finishedAt = new Date();
    const sets: CompletedSet[] = [];

    this.sections().forEach(section => {
      section.sets
        .filter(s => s.completed)
        .forEach(s => {
          sets.push({
            exerciseName: section.exercise.name,
            setNumber: s.setNumber,
            actualWeightKg: s.weightKg,
            actualReps: s.reps,
          });
        });
    });

    const summary = await this.facade.completeSession({
      workoutTemplateId: this.templateId(),
      startedAt: this.startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      sets,
    });

    this.finishing.set(false);

    // Fix 3 — on success, completionSummary() signal is non-null →
    // WorkoutCompletionCardComponent slides up as an overlay on this page.
    // Navigation happens when the user dismisses the card (onCompletionDismissed).
    // On null (error), alerts.error was already shown in the service.
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  exitSession(): void {
    this.router.navigate(['/plans']);
  }

  /** Fix 3 — called by WorkoutCompletionCardComponent's (dismissed) output. */
  onCompletionDismissed(): void {
    this.facade.resetCompletionSummary();
    this.router.navigate(['/plans']);
  }

  // ── Formatters ─────────────────────────────────────────────────────────────

  private formatElapsed(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  trackBySection(_: number, section: ExerciseSection): string {
    return section.exercise.name;
  }

  trackBySet(_: number, set: ExerciseSetEntry): number {
    return set.setNumber;
  }
}
