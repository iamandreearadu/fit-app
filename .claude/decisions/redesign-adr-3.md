# ADR: DailyUserDataComponent Refactor Strategy

**ID:** REDESIGN-ADR-3 (RISK-3)
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @angular-developer

---

## Context

The Dashboard redesign replaces the monolithic `DailyUserDataComponent` (a single large ReactiveFormsModule form with ~400 line template) with a grid of independent `MetricCardComponent` instances, each managing one metric. The current form group controls weight, energy level, water, steps, macros, and activity type. The auto-save logic watches the entire form group for changes and saves after a debounce.

The question: how do the individual metric cards write data back to the backend without the form group orchestrating them?

## Decision

**Option (b): Signal-based per-card binding with a debounced save effect in DashboardFacade.**

### Architecture

Each metric card writes directly to a writable signal in `DashboardFacade`. A single `effect()` in the facade watches all metric signals and triggers a debounced auto-save to the backend.

### New Signals in DashboardFacade

```typescript
// DashboardFacade — writable signals for editable metrics
readonly weightKg = signal<number | null>(null);
readonly energyLevel = signal<number | null>(null);
readonly waterConsumedL = signal<number>(0);
readonly activityType = signal<DayType | null>(null);
readonly steps = signal<number>(0);
readonly macrosPct = signal<{ protein: number; carbs: number; fats: number }>({
  protein: 40, carbs: 30, fats: 30
});
readonly caloriesBurned = signal<number>(0);

// Auto-save status signal (replaces form-based save status)
readonly autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

// Debounced save effect — replaces the FormGroup valueChanges pipe
private saveTimeout: ReturnType<typeof setTimeout> | null = null;

constructor() {
  // Effect watches all writable metric signals
  effect(() => {
    // Access all signals to register them as dependencies
    const weight = this.weightKg();
    const energy = this.energyLevel();
    const water = this.waterConsumedL();
    const activity = this.activityType();
    const stepCount = this.steps();
    const macros = this.macrosPct();
    const burned = this.caloriesBurned();
    
    // Skip initial load (signals not yet hydrated from API)
    if (!this.isHydrated()) return;
    
    // Debounce: cancel previous pending save
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    
    this.saveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 1500); // 1.5s debounce — same as current form implementation
  });
}
```

### Hydration Flow

When the dashboard loads, `loadTodayData()` fetches the daily entry from the backend and hydrates all writable signals:

```typescript
private readonly isHydrated = signal(false);

async loadTodayData(): Promise<void> {
  const data = await firstValueFrom(this.dailyService.getTodayData());
  
  // Hydrate all signals from API response — no save trigger
  this.isHydrated.set(false);
  this.weightKg.set(data.manualWeight ?? null);
  this.energyLevel.set(data.energyLevel ?? null);
  this.waterConsumedL.set(data.waterConsumedL ?? 0);
  this.activityType.set(data.activityType ?? null);
  this.steps.set(data.steps ?? 0);
  this.macrosPct.set(data.macrosPct ?? { protein: 40, carbs: 30, fats: 30 });
  this.caloriesBurned.set(data.caloriesBurned ?? 0);
  
  // Mark hydrated — effect will now respond to future changes
  // Use untracked or queueMicrotask to avoid triggering save
  queueMicrotask(() => this.isHydrated.set(true));
}
```

### Auto-Save Implementation

```typescript
private async performAutoSave(): Promise<void> {
  this.autoSaveStatus.set('saving');
  
  const payload: DailyUserData = {
    date: this.currentDateIso(),
    activityType: this.activityType() ?? undefined,
    waterConsumedL: this.waterConsumedL(),
    steps: this.steps(),
    stepTarget: this.stepTarget(),
    macrosPct: this.macrosPct(),
    caloriesBurned: this.caloriesBurned(),
    manualWeight: this.weightKg() ?? undefined,
    energyLevel: this.energyLevel() ?? undefined,
  };
  
  try {
    await firstValueFrom(this.dailyService.saveDailyData(payload));
    this.autoSaveStatus.set('saved');
    setTimeout(() => {
      if (this.autoSaveStatus() === 'saved') {
        this.autoSaveStatus.set('idle');
      }
    }, 2000);
  } catch {
    this.autoSaveStatus.set('error');
  }
}
```

### Validation Per Card

Validation errors surface per-card via computed signals rather than per-form-control:

```typescript
// Example: weight validation
readonly weightError = computed(() => {
  const w = this.weightKg();
  if (w !== null && (w < 20 || w > 300)) return 'Weight must be between 20 and 300 kg';
  return null;
});

// Example: energy level validation
readonly energyError = computed(() => {
  const e = this.energyLevel();
  if (e !== null && (e < 1 || e > 5)) return 'Energy level must be between 1 and 5';
  return null;
});
```

Each `MetricCardComponent` reads its corresponding error signal and displays inline validation text using `var(--color-error)` / `var(--text-sm)`.

The `performAutoSave` method checks all error signals before saving:

```typescript
private hasValidationErrors(): boolean {
  return !!(this.weightError() || this.energyError());
}
```

### Quick Action Methods (preserve existing API)

The existing `adjustWaterMl(amount: number)` method continues to work — it updates `this.waterConsumedL`:

```typescript
adjustWaterMl(amount: number): void {
  this.waterConsumedL.update(current => Math.max(0, current + amount / 1000));
}
```

### Component Integration

Each metric card receives the facade reference and uses its specific signal:

```typescript
// Weight MetricCard
@Component({
  template: `
    <input type="number" [value]="facade.weightKg()" 
           (input)="onWeightChange($event)" />
    @if (facade.weightError()) {
      <span class="metric-card-error">{{ facade.weightError() }}</span>
    }
  `
})
export class WeightMetricCardComponent {
  readonly facade = inject(DashboardFacade);
  
  onWeightChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.facade.weightKg.set(isNaN(value) ? null : value);
  }
}
```

### Computed Signals (read-only, derived)

These remain unchanged from the dashboard-redesign.md spec:

```typescript
readonly goalsComplete = computed(() => { /* ... */ });
readonly completionPercent = computed(() => { /* ... */ });
readonly proteinTargetG = computed(() => { /* ... */ });
readonly carbsTargetG = computed(() => { /* ... */ });
readonly fatTargetG = computed(() => { /* ... */ });
readonly caloriesRemaining = computed(() => { /* ... */ });
readonly isFirstDay = computed(() => { /* ... */ });
```

### Migration Path from ReactiveFormsModule

1. The `DailyUserDataComponent` is NOT deleted immediately — it is gradually emptied as its responsibilities move to individual metric cards
2. The form group is removed from the component template
3. The facade's auto-save effect replaces the `form.valueChanges.pipe(debounceTime(1500))` subscription
4. All `FormControl` references are replaced by signal reads/writes
5. The `DailyUserDataComponent` can be removed entirely once all metric cards are live and the history accordion wraps `PreviousDailyUserDataComponent`

### Existing Tests Affected

- Any test that references `DailyUserDataComponent.form` or its FormControls will break
- Tests that verify auto-save behavior via `form.patchValue()` must be rewritten to use signal `.set()` calls
- The `DashboardFacade` needs new unit tests for the debounced save effect pattern

## Consequences

- **Gain:** Full alignment with Angular 19 Signals architecture — no RxJS subscriptions for state
- **Gain:** Individual metric cards are independently testable, reusable (e.g., in the beSocial daily panel)
- **Gain:** Per-card validation is visually localized — errors appear next to the relevant input, not in a form-level banner
- **Accept:** The debounced effect pattern is less explicit than `valueChanges.pipe(debounceTime())` — requires careful `isHydrated` gating to prevent save-on-load
- **Accept:** Temporary coexistence of old `DailyUserDataComponent` and new metric cards during migration
- **Rollback:** Revert to the form group approach — the backend API is unchanged

## Instructions for @angular-developer

1. Add all writable metric signals to `DashboardFacade` (or a new `DashboardMetricsFacade` if the file is too large)
2. Add the `isHydrated` signal and hydration flow in `loadTodayData()`
3. Add the debounced save `effect()` with `isHydrated` guard
4. Add validation computed signals per metric
5. Add `autoSaveStatus` signal and the save indicator rendering (reuse existing `.save-badge` pattern)
6. Build each metric card component to read/write its signal from the facade
7. Preserve `adjustWaterMl()` and other quick-action methods — they update the writable signals directly
8. Do NOT remove `DailyUserDataComponent` until all metric cards are live — keep both during transition
9. Update or mark as skip any tests that reference `form` directly
