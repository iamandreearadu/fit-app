import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';
import { WorkoutTemplate, WorkoutType } from '../../../core/models/workouts-tab.model';

@Component({
  selector: 'app-workouts-tab',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule],
  templateUrl: './workouts-tab.component.html',
  styleUrl: './workouts-tab.component.css'
})
export class WorkoutsTabComponent implements OnInit {
  readonly facade = inject(WorkoutsTabFacade);
  private fb = inject(FormBuilder);

  loading = false;

  templates: WorkoutTemplate[] = [];
  filtered: WorkoutTemplate[] = [];

  searchTerm = '';
  selectedType: 'all' | WorkoutType = 'all';
  types: WorkoutType[] = ['Strength', 'Circuit', 'HIIT', 'Crossfit', 'Cardio', 'Other'];
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

  ngOnInit(): void {
    this.facade.templates$.subscribe(t => {
      this.templates = t ?? [];
      this.applyFilters();
    });

    this.loading = true;
    this.facade.loadTemplates().finally(() => (this.loading = false));

    this.form.controls.type.valueChanges.subscribe(type => {
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

    this.loading = true;
    try {
      await this.facade.createOrUpdateTemplate(payload);
      await this.facade.loadTemplates();
    } finally {
      this.loading = false;
      this.showEditor = false;
      this.editing = false;
    }
  }

  async delete(uid?: string): Promise<void> {
    if (!uid) return;
    const ok = confirm('Delete this workout?');
    if (!ok) return;

    this.loading = true;
    try {
      await this.facade.deleteTemplate(uid);
    } finally {
      this.loading = false;
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

  private onTypeChange(type: WorkoutType): void {
    if (type === 'Cardio') {
      this.exercises.clear();
    } else {
      if (this.exercises.length === 0) this.addExercise();
    }
  }
}
