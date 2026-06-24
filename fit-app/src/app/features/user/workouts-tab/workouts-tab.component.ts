import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';
import { WorkoutTemplate, WorkoutType } from '../../../core/models/workouts-tab.model';
import { UserStore } from '../../../core/store/user.store';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';
import { AlertService } from '../../../shared/services/alert.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { WorkoutsGuidedEmptyComponent } from '../../workouts/guided-empty/workouts-guided-empty.component';

@Component({
  selector: 'app-workouts-tab',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule, MatDialogModule, WorkoutsGuidedEmptyComponent],
  templateUrl: './workouts-tab.component.html',
  styleUrl: './workouts-tab.component.css'
})
export class WorkoutsTabComponent implements OnInit {
  readonly facade = inject(WorkoutsTabFacade);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);
  private readonly groqFacade = inject(GroqAiFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  aiCalories: Partial<Record<string, { loading: boolean; calories?: number; explanation?: string }>> = {};

  templates: WorkoutTemplate[] = [];
  filtered: WorkoutTemplate[] = [];

  searchTerm = '';
  selectedType: 'all' | WorkoutType = 'all';
  types: WorkoutType[] = ['Strength', 'Circuit', 'HIIT', 'Crossfit', 'Cardio','Other'];
  expandedUid: string | null = null;

  showEditor = false;
  editing = false;

  form = this.fb.group({
    uid: this.fb.control<string | null>(null),
    id: this.fb.control<number | null>(null),

    title: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    type: this.fb.control<WorkoutType>('Strength', { nonNullable: true }),

    durationMin: this.fb.control<number>(60, [Validators.required, Validators.min(1)]),
    caloriesEstimateKcal: this.fb.control<number>(350, [Validators.required, Validators.min(0)]),

    exercises: this.fb.array<FormGroup>([]),
    cardio: this.fb.group({
      km: this.fb.control<number>(5, [Validators.required, Validators.min(0)]),
      incline: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
      notes: this.fb.control<string>('')
    }),
    notes: this.fb.control<string>('')
  });

  /**
   * True when the backend returned only system templates (user has no personal ones).
   * Drives visibility of WorkoutsGuidedEmptyComponent inside the card body.
   * Reactive: re-evaluates whenever loading or templatesSignal changes.
   */
  readonly isGuidedEmpty = computed(() =>
    !this.loading() &&
    this.facade.templatesSignal().length > 0 &&
    this.facade.templatesSignal().every(t => t.isSystemTemplate)
  );

  ngOnInit(): void {
    this.facade.templates$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(t => {
      this.templates = t ?? [];
      this.applyFilters();
    });

    this.loading.set(true);
    this.facade.loadTemplates().finally(() => this.loading.set(false));

    this.form.controls.type.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(type => {
      this.onTypeChange(type);
    });

    this.onTypeChange(this.form.controls.type.value);
  }

  get exercises(): FormArray<FormGroup> {
    return this.form.controls.exercises as FormArray<FormGroup>;
  }

  isCardio(): boolean {
    return this.form.controls.type.value === 'Cardio';
  }

  applyFilters(): void {
    const term = (this.searchTerm ?? '').trim().toLowerCase();

    this.filtered = (this.templates ?? []).filter(w => {
      if (this.selectedType !== 'all' && w.type !== this.selectedType) return false;
      if (!term) return true;

      return (
        (w.title ?? '').toLowerCase().includes(term) ||
        (w.type ?? '').toLowerCase().includes(term)
      );
    });
  }


togglePreview(w: any): void {
  const uid = w?.uid ?? null;
  if (!uid) return;
  this.expandedUid = this.expandedUid === uid ? null : uid;
}

isExpanded(w: any): boolean {
  const uid = w?.uid ?? null;
  return !!uid && this.expandedUid === uid;
}

stop(e: Event): void {
  e.stopPropagation();
}

clearAiResult(uid: string, event: Event): void {
  event.stopPropagation();
  if (uid) delete this.aiCalories[uid];
}

async estimateCalories(w: WorkoutTemplate, event: Event): Promise<void> {
  event.stopPropagation();
  const uid = w.uid;
  if (!uid) return;

  const user = this.userStore.user();
  if (!user) return;

  this.aiCalories[uid] = { loading: true };

  try {
    const { calories, explanation } = await this.groqFacade.calculateWorkoutCalories(user, w);
    this.aiCalories[uid] = { loading: false, calories, explanation };
  } catch {
    this.aiCalories[uid] = { loading: false, explanation: 'Could not estimate calories. Please try again.' };
  }
}


  openCreate(): void {
    this.editing = false;
    this.showEditor = true;

    this.form.reset({
      uid: null,
      id: null,
      title: '',
      type: 'Strength',
      durationMin: 60,
      caloriesEstimateKcal: 350,
      notes: '',
      cardio: { km: 5, incline: 0, notes: '' }
    } as any);

    this.exercises.clear();
    this.addExercise();
    this.onTypeChange('Strength');
  }

  openEdit(item: WorkoutTemplate): void {
    this.editing = true;
    this.showEditor = true;

    this.form.patchValue({
      uid: item.uid ?? null,
      id: item.id ?? null,
      title: item.title ?? '',
      type: (item.type ?? 'Strength') as WorkoutType,
      durationMin: Number(item.durationMin ?? 0),
      caloriesEstimateKcal: Number(item.caloriesEstimateKcal ?? 0),
      notes: (item as any).notes ?? ''
    });

    // cardio
    const cardio = item.cardio ?? { km: 0, incline: 0, notes: '' };
    this.form.controls.cardio.patchValue({
      km: Number(cardio.km ?? 0),
      incline: Number(cardio.incline ?? 0),
      notes: cardio.notes ?? ''
    });

    // exercises
    this.exercises.clear();
    const ex = Array.isArray(item.exercises) ? item.exercises : [];
    if (ex.length) {
      ex.forEach(e => this.exercises.push(this.createExerciseGroup(e)));
    } else {
      this.addExercise();
    }

    this.onTypeChange(this.form.controls.type.value);
  }

  cancel(): void {
    this.showEditor = false;
    this.editing = false;
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: Partial<WorkoutTemplate> = {
      uid: raw.uid ?? undefined,
      id: raw.id ?? undefined,
      title: raw.title?.trim() ?? '',
      type: raw.type,
      durationMin: Number(raw.durationMin ?? 0),
      caloriesEstimateKcal: Number(raw.caloriesEstimateKcal ?? 0)
    };

    if (raw.type === 'Cardio') {
      payload.cardio = {
        km: Number(raw.cardio?.km ?? 0),
        incline: Number(raw.cardio?.incline ?? 0),
        notes: raw.cardio?.notes ?? ''
      };
      payload.exercises = [];
    } else {
      payload.exercises = (raw.exercises ?? []).map((e: any) => ({
        name: (e.name ?? '').trim(),
        sets: Number(e.sets ?? 0),
        reps: Number(e.reps ?? 0),
        weightKg: Number(e.weightKg ?? 0),
        notes: e.notes ?? ''
      }));
      payload.cardio = undefined;
    }

    this.loading.set(true);
    try {
      await this.facade.createOrUpdateTemplate(payload);
      await this.facade.loadTemplates();
    } finally {
      this.loading.set(false);
      this.showEditor = false;
      this.editing = false;
    }
  }

  async delete(uid?: string): Promise<void> {
    if (!uid) return;
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: { message: 'Delete this workout?', dangerous: true },
        panelClass: 'confirm-dialog-panel',
        maxWidth: '360px',
        width: '100%',
      }).afterClosed()
    );
    if (!confirmed) return;

    this.loading.set(true);
    try {
      await this.facade.deleteTemplate(uid);
      this.alerts.success('Workout deleted.');
    } catch {
      this.alerts.error('Failed to delete workout.');
    } finally {
      this.loading.set(false);
    }
  }

  private createExerciseGroup(value?: any): FormGroup {
    return this.fb.group({
      name: this.fb.control<string>(value?.name ?? '', [Validators.required, Validators.minLength(2)]),
      sets: this.fb.control<number>(Number(value?.sets ?? 4), [Validators.required, Validators.min(1)]),
      reps: this.fb.control<number>(Number(value?.reps ?? 12), [Validators.required, Validators.min(1)]),
      weightKg: this.fb.control<number>(Number(value?.weightKg ?? 0), [Validators.required, Validators.min(0)]),
      notes: this.fb.control<string>(value?.notes ?? '')
    });
  }

  addExercise(): void {
    this.exercises.push(this.createExerciseGroup());
  }

  removeExercise(index: number): void {
    if (this.exercises.length <= 1) return;
    this.exercises.removeAt(index);
  }

  startWorkout(w: WorkoutTemplate, event: Event): void {
    event.stopPropagation();
    if (!w.id) return;
    this.router.navigate(['/workout-session', w.id]);
  }

  private onTypeChange(type: WorkoutType): void {
    if (type === 'Cardio') {
      this.exercises.clear();
    } else {
      if (this.exercises.length === 0) this.addExercise();
    }
  }
}
