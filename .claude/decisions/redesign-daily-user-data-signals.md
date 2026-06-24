# ADR: DailyUserDataComponent Refactor — ReactiveFormsModule to Signals

**ID:** REDESIGN-ADR-3
**Status:** Proposed
**Date:** 2026-06-04
**Author:** @tech-architect
**Consumed by:** @angular-developer
**Blocks:** Sprint 2 — MetricCardsGridComponent (ITEM-10)
**Supersedes:** `.claude/decisions/redesign-adr-3.md` (draft)

---

## Context

The Dashboard redesign replaces the monolithic `DailyUserDataComponent` with a grid of independent `MetricCardComponent` instances. Each card manages one metric (weight, energy, water, macros, etc.).

The current `DailyUserDataComponent` (`daily-user-data.component.ts`) uses:
- `FormBuilder` + `FormGroup` with `ReactiveFormsModule` (imported at line 3)
- `this.form: FormGroup` (declared at line 29, built at line 321 via `buildForm()`)
- `form.valueChanges.pipe(debounceTime(1200))` (line 214–217) for auto-save
- `form.get('activityType')?.valueChanges` (line 250) for activity-to-calorie mapping
- `form.markAsDirty()` / `form.markAsPristine()` for dirty tracking
- `autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'` (line 91) as a class property

The form contains controls for: `date`, `activityType`, `waterConsumedL`, `steps`, `stepTarget`, `macrosPct` (FormGroup: protein, carbs, fats), `caloriesBurned`, `caloriesIntake`, `caloriesTotal`, `manualWeight`, `energyLevel`.

The question: how do individual metric cards write data back to the backend without the form group orchestrating them?

## Decision

**Signal-based per-card binding with a debounced save `effect()` in `DashboardFacade`.**

Each metric card writes directly to a writable signal. A single `effect()` watches all metric signals and triggers a debounced auto-save.

---

## Signal ↔ FormControl Mapping

| Current FormControl | Replacement Signal | Signal Type | Card Consumer |
|--------------------|--------------------|-------------|---------------|
| `form.get('manualWeight')` | `weightKg` | `signal<number \| null>(null)` | WeightCardComponent |
| `form.get('energyLevel')` | `energyLevel` | `signal<number \| null>(null)` | EnergyCardComponent |
| `form.get('waterConsumedL')` | `waterConsumedL` | `signal<number>(0)` | ProgressRingsHero (water ring) + QuickActionsStrip (+Water chip) |
| `form.get('activityType')` | `activityType` | `signal<string \| null>(null)` | ProgressRingsHero (activity chip) |
| `form.get('steps')` | `steps` | `signal<number>(0)` | (future metric card) |
| `form.get('macrosPct')` (FormGroup) | `macrosPct` | `signal<{ protein: number; carbs: number; fats: number }>({...})` | MacroProgressCardComponent |
| `form.get('caloriesBurned')` | `caloriesBurned` | `signal<number>(0)` | CaloriesRemainingCard, NetCaloriesCard |
| `form.get('caloriesIntake')` | Removed — derived from NutritionTabFacade | `computed<number>` | CaloriesRemainingCard |
| `form.get('caloriesTotal')` | Removed — derived from `caloriesIntake - caloriesBurned` | `computed<number>` | NetCaloriesCard |
| `form.get('stepTarget')` | `stepTarget` | `signal<number>(3000)` | (future metric card) |
| `form.get('date')` | `currentDateIso` | `signal<string>` | All cards (date context) |
| `autoSaveStatus` (class property) | `autoSaveStatus` | `signal<'idle' \| 'saving' \| 'saved' \| 'error'>('idle')` | Save indicator in greeting strip |

---

## New Facade: `DashboardFacade`

**File to create:** `fit-app/src/app/core/facade/dashboard.facade.ts`

### Writable Signals (replace FormControls)

```typescript
@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly dailyService = inject(DailyService);    // existing API service
  private readonly userFacade = inject(UserFacade);         // existing facade

  // ── Writable metric signals ──────────────────────────────
  readonly currentDateIso = signal<string>(new Date().toISOString().slice(0, 10));
  readonly weightKg = signal<number | null>(null);
  readonly energyLevel = signal<number | null>(null);
  readonly waterConsumedL = signal<number>(0);
  readonly activityType = signal<string | null>(null);
  readonly steps = signal<number>(0);
  readonly stepTarget = signal<number>(3000);
  readonly macrosPct = signal<{ protein: number; carbs: number; fats: number }>({
    protein: 40, carbs: 30, fats: 30
  });
  readonly caloriesBurned = signal<number>(0);

  // ── Auto-save status ────────────────────────────────────
  readonly autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ── Hydration guard ─────────────────────────────────────
  private readonly isHydrated = signal(false);
```

### Computed Signals (new — no FormControl equivalent)

```typescript
  // ── Goal completion ─────────────────────────────────────
  readonly goalsComplete = computed(() => {
    let count = 0;
    const summary = this.todaySummary();                    // from existing data
    if (summary && summary.caloriesFromNutritionLog > 0) count++;
    if (this.waterProgress() >= 100) count++;
    if (this.isActivityLogged()) count++;
    if (this.weightKg() != null && this.weightKg()! > 0) count++;
    return count;
  });

  readonly completionPercent = computed(() =>
    Math.round((this.goalsComplete() / 4) * 100)
  );

  // ── Macro targets (derived from TDEE) ───────────────────
  readonly proteinTargetG = computed(() => {
    const tdee = this.userFacade.metrics()?.tdee;
    return tdee ? Math.round((tdee * 0.30) / 4) : 0;       // 30% protein at 4 kcal/g
  });

  readonly carbsTargetG = computed(() => {
    const tdee = this.userFacade.metrics()?.tdee;
    return tdee ? Math.round((tdee * 0.45) / 4) : 0;       // 45% carbs at 4 kcal/g
  });

  readonly fatTargetG = computed(() => {
    const tdee = this.userFacade.metrics()?.tdee;
    return tdee ? Math.round((tdee * 0.25) / 9) : 0;       // 25% fat at 9 kcal/g
  });

  // ── Calories remaining (MyFitnessPal framing) ──────────
  readonly caloriesRemaining = computed(() => {
    const tdee = this.userFacade.metrics()?.tdee ?? 0;
    const consumed = this.todaySummary()?.caloriesFromNutritionLog ?? 0;
    const burned = this.caloriesBurned();
    return Math.max(0, tdee - consumed + burned);
  });

  // ── Day 1 detection ─────────────────────────────────────
  readonly isFirstDay = computed(() =>
    this.historyEntries().length === 0
  );

  // ── Validation ──────────────────────────────────────────
  readonly weightError = computed(() => {
    const w = this.weightKg();
    if (w !== null && (w < 20 || w > 300)) return 'Weight must be between 20 and 300 kg';
    return null;
  });

  readonly energyError = computed(() => {
    const e = this.energyLevel();
    if (e !== null && (e < 1 || e > 5)) return 'Energy level must be between 1 and 5';
    return null;
  });
```

### Hydration Flow (replaces `patchForm(data)`)

```typescript
  async loadTodayData(): Promise<void> {
    const data = await firstValueFrom(this.dailyService.getDaily(this.currentDateIso()));

    // Hydrate signals from API — suppress save effect during hydration
    this.isHydrated.set(false);
    this.weightKg.set(data?.manualWeight ?? null);
    this.energyLevel.set(data?.energyLevel ?? null);
    this.waterConsumedL.set(data?.waterConsumedL ?? 0);
    this.activityType.set(data?.activityType ?? null);
    this.steps.set(data?.steps ?? 0);
    this.stepTarget.set(data?.stepTarget ?? 3000);
    this.macrosPct.set({
      protein: data?.macrosProtein ?? 40,
      carbs: data?.macrosCarbs ?? 30,
      fats: data?.macrosFats ?? 30
    });
    this.caloriesBurned.set(data?.caloriesBurned ?? 0);

    // Mark hydrated — effect responds to future changes only
    queueMicrotask(() => this.isHydrated.set(true));
  }
```

### Debounced Auto-Save Effect (replaces `form.valueChanges.pipe(debounceTime(1200))`)

```typescript
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      // Access all writable signals to register as dependencies
      const _w = this.weightKg();
      const _e = this.energyLevel();
      const _water = this.waterConsumedL();
      const _act = this.activityType();
      const _steps = this.steps();
      const _macros = this.macrosPct();
      const _burned = this.caloriesBurned();
      const _target = this.stepTarget();

      // Skip initial load
      if (!this.isHydrated()) return;

      // Debounce
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.performAutoSave();
      }, 1500);
    });
  }

  private hasValidationErrors(): boolean {
    return !!(this.weightError() || this.energyError());
  }

  private async performAutoSave(): Promise<void> {
    if (this.hasValidationErrors()) return;

    this.autoSaveStatus.set('saving');

    const payload = {
      date: this.currentDateIso(),
      activityType: this.activityType() ?? undefined,
      waterConsumedL: this.waterConsumedL(),
      steps: this.steps(),
      stepTarget: this.stepTarget(),
      macrosProtein: this.macrosPct().protein,
      macrosCarbs: this.macrosPct().carbs,
      macrosFats: this.macrosPct().fats,
      caloriesBurned: this.caloriesBurned(),
      manualWeight: this.weightKg() ?? undefined,
      energyLevel: this.energyLevel() ?? undefined,
    };

    try {
      await firstValueFrom(this.dailyService.saveDaily(payload));
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

### Quick-Action Methods (preserve existing API)

```typescript
  adjustWaterMl(amount: number): void {
    this.waterConsumedL.update(current => Math.max(0, current + amount / 1000));
  }

  adjustSteps(amount: number): void {
    this.steps.update(current => Math.max(0, current + amount));
  }
```

---

## Component Integration Pattern

Each metric card injects the facade and reads/writes its specific signal:

```typescript
@Component({
  selector: 'app-weight-card',
  template: `
    <div class="metric-card">
      <input type="number" [value]="facade.weightKg()" step="0.1"
             (input)="onWeightChange($event)" />
      @if (facade.weightError()) {
        <span class="metric-card-error">{{ facade.weightError() }}</span>
      }
    </div>
  `
})
export class WeightCardComponent {
  readonly facade = inject(DashboardFacade);

  onWeightChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.facade.weightKg.set(isNaN(value) ? null : value);
  }
}
```

---

## Component Split Strategy

| Current location in `DailyUserDataComponent` | New component | Signal(s) consumed |
|----------------------------------------------|---------------|-------------------|
| Weight input field | `WeightCardComponent` | `weightKg`, `weightError` |
| Energy level emoji selector | `EnergyCardComponent` | `energyLevel`, `energyError` |
| Water controls (+250ml, +500ml, current display) | `ProgressRingsHeroComponent` (water ring) + `QuickActionsStripComponent` (+Water chip) | `waterConsumedL` |
| Activity type picker | `ProgressRingsHeroComponent` (activity status chip) | `activityType` |
| Macros percentage inputs | `MacroProgressCardComponent` | `macrosPct`, `proteinTargetG`, `carbsTargetG`, `fatTargetG` |
| Steps display | (deferred — not in Sprint 2 metric cards) | `steps`, `stepTarget` |
| Calories burned display | `CaloriesRemainingCardComponent` | `caloriesBurned`, `caloriesRemaining` |
| Auto-save indicator (save badge) | `DashboardGreetingComponent` (sub-row) | `autoSaveStatus` |
| Meal picker modal trigger | `QuickActionsStripComponent` (+Meal chip) | (modal trigger, no signal) |
| AI analyzer trigger | `QuickActionsStripComponent` (AI chip) | (modal trigger, no signal) |
| Calorie balance overlay | `CaloriesRemainingCardComponent` | `caloriesRemaining` |
| Date display | `DashboardGreetingComponent` (sub-row) | `currentDateIso` |
| Activity-to-calorie mapping | `DashboardFacade` (internal effect) | `activityType` → `caloriesBurned` |

---

## Migration Path from ReactiveFormsModule

### Phase 1 (Sprint 2 — metric cards ship):
1. Create `DashboardFacade` with all writable and computed signals
2. Create individual metric card components reading from facade
3. **Keep `DailyUserDataComponent` alive** — but remove the metric fields from its template that are now handled by metric cards
4. The `DailyUserDataComponent.form` continues to exist for any fields NOT yet migrated to cards (e.g., steps, calorie balance overlay)
5. The facade's `loadTodayData()` is called from the `DashboardPageComponent.ngOnInit` — replaces the existing `DailyUserDataComponent.ngOnInit` data load

### Phase 2 (Sprint 3+):
1. All remaining fields migrated to metric cards or other components
2. The `form` is removed entirely
3. `ReactiveFormsModule` import removed from `DailyUserDataComponent`
4. `DailyUserDataComponent` deleted once all functionality is distributed

### Coexistence rule:
During Phase 1, `DailyUserDataComponent` and metric cards both exist on the page. **They must NOT both auto-save the same fields.** The facade auto-save replaces the form auto-save. The `DailyUserDataComponent.form.valueChanges.pipe(debounceTime(1200))` subscription must be removed when the facade is active.

---

## Existing Tests Affected

- Tests referencing `DailyUserDataComponent.form` or `form.get('...')` will break when the FormGroup is removed
- Tests verifying auto-save via `form.patchValue()` must be rewritten to use `facade.weightKg.set()` etc.
- `DashboardFacade` needs new unit tests for:
  - Debounced save effect triggers after 1.5s
  - `isHydrated` guard prevents save during `loadTodayData()`
  - `goalsComplete` correctly counts each of the 4 conditions
  - `completionPercent` returns 0/25/50/75/100
  - `weightError` / `energyError` return correct messages for invalid values
  - `adjustWaterMl` correctly adds/subtracts

---

## Consequences

- **Gain:** Full alignment with Angular 19 Signals architecture — no RxJS subscriptions for state
- **Gain:** Individual metric cards are independently testable, reusable (e.g., in the beSocial daily panel)
- **Gain:** Per-card validation is visually localized — errors appear next to the relevant input
- **Gain:** Computed signals (`goalsComplete`, `completionPercent`, etc.) enable the progress rings hero with zero new API calls
- **Accept:** The debounced effect pattern is less explicit than `valueChanges.pipe(debounceTime())` — requires careful `isHydrated` gating
- **Accept:** Temporary coexistence of `DailyUserDataComponent` and metric cards during Phase 1
- **Accept:** Must remove form-based auto-save to prevent double-save during coexistence
- **Rollback:** Revert to the form group approach — the backend API is unchanged

---

## Instructions for @angular-developer

1. Create `DashboardFacade` in `core/facade/dashboard.facade.ts` with all writable signals listed above
2. Add `isHydrated` signal and implement `loadTodayData()` with microtask guard
3. Add the debounced save `effect()` with `isHydrated` check — 1500ms debounce
4. Add all computed signals: `goalsComplete`, `completionPercent`, `proteinTargetG`, `carbsTargetG`, `fatTargetG`, `caloriesRemaining`, `isFirstDay`
5. Add validation computed signals: `weightError`, `energyError`
6. Add `autoSaveStatus` signal and `performAutoSave()` private method
7. Add `adjustWaterMl()` method (same semantics as existing — `current + amount / 1000`)
8. Build each metric card component to inject `DashboardFacade` and read/write its signal
9. In `DashboardPageComponent`, call `dashboardFacade.loadTodayData()` in `ngOnInit`
10. **Disable or remove** the `form.valueChanges.pipe(debounceTime)` subscription in `DailyUserDataComponent` once the facade auto-save is active — prevent double-save
11. Do NOT delete `DailyUserDataComponent` until all metric cards are live and tested
12. Write unit tests for `DashboardFacade` computed signals and auto-save behavior
