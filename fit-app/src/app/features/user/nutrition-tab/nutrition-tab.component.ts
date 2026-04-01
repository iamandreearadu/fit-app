import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { NutritionTabFacade } from '../../../core/facade/nutrition-tab.facade';
import { MealEntry, MealType } from '../../../core/models/nutrition-tab.model';

@Component({
  selector: 'app-nutrition-tab',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule],
  templateUrl: './nutrition-tab.component.html',
  styleUrl: './nutrition-tab.component.css'
})
export class NutritionTabComponent implements OnInit {

  readonly facade = inject(NutritionTabFacade);
  private fb = inject(FormBuilder);

  loading = false;
  meals: MealEntry[] = [];
  filtered: MealEntry[] = [];

  searchTerm = '';
  selectedType: 'all' | MealType = 'all';
  types: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'];

  expandedUid: string | null = null;
  showEditor = false;
  editing = false;

  form = this.fb.group({
    uid: this.fb.control<string | null>(null),
    name: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    type: this.fb.control<MealType>('Breakfast', { nonNullable: true }),
    date: this.fb.control<string>(new Date().toISOString().slice(0, 10), [Validators.required]),
    notes: this.fb.control<string>(''),
    items: this.fb.array<FormGroup>([]),
  });

  ngOnInit(): void {
    this.facade.meals$.subscribe(m => {
      this.meals = m ?? [];
      this.applyFilters();
    });

    this.loading = true;
    this.facade.loadMeals().finally(() => (this.loading = false));
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  private buildItemGroup(): FormGroup {
    return this.fb.group({
      name: this.fb.control<string>('', [Validators.required]),
      grams: this.fb.control<number>(100, [Validators.required, Validators.min(0)]),
      calories: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
      protein_g: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
      carbs_g: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
      fats_g: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    });
  }

  addItem(): void {
    this.items.push(this.buildItemGroup());
  }

  removeItem(i: number): void {
    this.items.removeAt(i);
  }

  get mealTotals() {
    const vals = this.items.value as any[];
    return vals.reduce(
      (acc, item) => ({
        grams:     acc.grams     + Number(item.grams     ?? 0),
        calories:  acc.calories  + Number(item.calories  ?? 0),
        protein_g: acc.protein_g + Number(item.protein_g ?? 0),
        carbs_g:   acc.carbs_g   + Number(item.carbs_g   ?? 0),
        fats_g:    acc.fats_g    + Number(item.fats_g    ?? 0),
      }),
      { grams: 0, calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    );
  }

  applyFilters(): void {
    let list = this.meals;
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter(m => m.name.toLowerCase().includes(term) || m.type.toLowerCase().includes(term));
    if (this.selectedType !== 'all') list = list.filter(m => m.type === this.selectedType);
    this.filtered = list;
  }

  isExpanded(m: MealEntry): boolean {
    return this.expandedUid === (m.uid ?? String(m.id));
  }

  togglePreview(m: MealEntry): void {
    const key = m.uid ?? String(m.id);
    this.expandedUid = this.expandedUid === key ? null : key;
  }

  openCreate(): void {
    this.editing = false;
    this.items.clear();
    this.form.reset({
      uid: null,
      name: '',
      type: 'Breakfast',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    this.addItem();
    this.showEditor = true;
  }

  openEdit(m: MealEntry): void {
    this.editing = true;
    this.items.clear();
    this.form.patchValue({
      uid: m.uid ?? null,
      name: m.name,
      type: m.type,
      date: m.date,
      notes: m.notes ?? '',
    });
    (m.items ?? []).forEach(item => {
      const g = this.buildItemGroup();
      g.patchValue(item);
      this.items.push(g);
    });
    if (this.items.length === 0) this.addItem();
    this.showEditor = true;
  }

  cancel(): void {
    this.showEditor = false;
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    await this.facade.saveMeal({
      uid: raw.uid ?? undefined,
      name: raw.name ?? '',
      type: raw.type,
      date: raw.date ?? new Date().toISOString().slice(0, 10),
      notes: raw.notes ?? '',
      items: (raw.items as any[]).map(i => ({
        name: i.name,
        grams: Number(i.grams),
        calories: Number(i.calories),
        protein_g: Number(i.protein_g),
        carbs_g: Number(i.carbs_g),
        fats_g: Number(i.fats_g),
      })),
    });
    this.cancel();
  }

  async deleteMeal(uid?: string): Promise<void> {
    if (!uid) return;
    await this.facade.deleteMeal(uid);
  }

  stop(e: Event): void { e.stopPropagation(); }
}
