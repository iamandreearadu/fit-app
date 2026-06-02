## UI Spec: Fix 1 Frontend — Food Search + Recent Foods in Add Meal

**Author:** @uiux-designer
**Date:** 2026-05-31
**Sprint:** 2 (frontend)
**API Contract:** `.claude/contracts/fix-1-food-database.md`
**Audit reference:** Full Platform Audit § 2 (Daily Core Loop) + § 7 (Mobile UX — friction point #2)
**Status:** READY_FOR_IMPLEMENTATION

---

### User Story

As a user logging a meal, I want to type a food name and have macros auto-fill from a
database — so I never have to look up or memorize protein/carbs/fat numbers, and I
can re-add a food I ate before in a single tap.

---

### UX Flow

```
1. User clicks "New meal" → Add Meal modal opens

2. User fills Meal name, Type, Date (unchanged)

3. User reaches "Food Items" section:

   a) RECENT FOODS PANEL (if user has history):
      → RecentFoodsListComponent shows last 10 used foods as horizontal chips
      → User taps a chip → new food item card appended, all fields pre-filled
      → Source set to "recent" on that item

   b) FOOD SEARCH (per item card):
      → Each food item card has FoodSearchComponent at the top
        replacing the plain "Food name" text field
      → User types ≥ 2 chars (e.g. "chicken breast")
      → 300ms debounce → GET /api/nutrition/foods/search?q=chicken+breast
      → Loading skeleton appears (3 skeleton rows)
      → Results list renders (up to 10 items)
      → User taps a result → all macro fields in that card auto-fill
        (name, grams=100, calories, protein, carbs, fats)
      → Source set to "search" on that item
      → User adjusts grams → macros scale proportionally
      → Dropdown closes; search input shows selected food name

   c) MANUAL ENTRY (always available):
      → After food selection from search: user can edit any field directly
      → With no search: user can type directly into the name field
        and fill macros manually
      → "Enter manually" text button below search in each card
        → collapses the search dropdown and focuses the name field for free-text input
      → Source set to "manual" on that item

4. User clicks "Add food item" → new card appended; another FoodSearchComponent
   ready for the next food

5. Live totals update as macros fill (existing behaviour, unchanged)

6. User clicks "Save meal" → POST /api/nutrition with source field per item
```

---

### Screens / Components

---

#### 1. Add Meal Modal — Updated Food Items Section Layout

**What changes in `nutrition-tab.component.html`:**

The Food Items `<div class="section">` gains two new sub-sections inserted
**above** the existing `<div formArrayName="items" class="ex-list">`:

```
[sec-head: set_meal icon + "Food Items"]
  ↓
[app-recent-foods  ← NEW — hidden if recentFoods is empty]
  ↓
[app-food-search inside each .ex-item card  ← replaces <mat-form-field "Food name">]
  ↓
[Live totals  ← unchanged]
  ↓
[btn-add-ex: "Add food item"  ← unchanged]
```

No changes to modal wrapper, header, footer, Meal Details section, or Notes section.

---

#### 2. FoodSearchComponent

**File:** `features/user/nutrition-tab/food-search/food-search.component.ts`
**Selector:** `app-food-search`
**Placement:** Inside each `.ex-item` card, replacing the span-2 "Food name" `mat-form-field`

**Inputs / Outputs:**
```typescript
@Input() initialValue: string = '';        // pre-fill for edit mode
@Input() itemIndex: number = 0;            // for aria-labels
@Output() foodSelected = new EventEmitter<FoodSearchResult>(); // USDA result
@Output() manualMode = new EventEmitter<void>(); // user chose "Enter manually"
```

**Internal Signals:**
```typescript
query         = signal('');
results       = signal<FoodSearchResult[]>([]);
searchLoading = signal(false);
showDropdown  = signal(false);
selected      = signal<FoodSearchResult | null>(null);
// stored per-100g base for smart grams scaling:
basePerHundred = signal<{ cal: number; p: number; c: number; f: number } | null>(null);
```

---

**Layout**

```
[.fs-wrap]  ← position: relative, full width
  [mat-form-field appearance="outline"]
    [mat-label] Search food database
    [mat-icon matPrefix] search (when no selection) | check_circle (when selected, color: #4ade80)
    [input] search input OR selected food name display
    [button matSuffix] clear × (only when selected)
  [.fs-dropdown]  ← absolute panel, below the input, z-index: 200
    [.fs-skeleton-list]  ← loading state
      [.fs-skeleton-row × 3]
    [.fs-result-list]  ← results state
      [.fs-result-item × N]
        [.fs-result-name]
        [.fs-result-meta]
          [.fs-per-100g-label]  "per 100g"
          [.macro-chip.protein]  P 22.5g
          [.macro-chip.carbs]   C 0g
          [.macro-chip.fats]    F 2.6g
        [.fs-result-serving]  ← optional, only if servingSize != null
    [.fs-empty-state]  ← empty state
    [.fs-manual-hint]  ← always shown at bottom of open dropdown
  [.fs-manual-btn-row]  ← below the field, outside dropdown
    [button.fs-manual-link] "Enter manually"
```

---

**Visual Spec**

Container `.fs-wrap`:
```css
position: relative;
width: 100%;
grid-column: span 2;   /* fills the span-2 slot in .grid-2.tight */
```

Search input field:
- `mat-form-field appearance="outline"` — uses existing global Material override
- `border-radius: 10px` (inherited from global mat-form-field override)
- Focus border: `var(--primary)` (inherited)
- `mat-icon matPrefix`: `search` icon, `rgba(255,255,255,0.35)`, 20px — becomes `check_circle` in `#4ade80` when food is selected
- Placeholder text: `Search food database…` (colour `rgba(255,255,255,0.3)`)
- Clear button `matSuffix`: 36×36px icon button; only visible when `selected()` is non-null

Dropdown panel `.fs-dropdown`:
```css
position: absolute;
top: calc(100% - 8px);   /* overlap the field bottom radius slightly */
left: 0;
right: 0;
z-index: 200;
background: #0d0d10;
border: 1px solid rgba(255,255,255,0.12);
border-radius: 14px;
box-shadow: 0 12px 32px rgba(0,0,0,0.6);
overflow: hidden;
animation: slideUp 0.2s ease-out;
max-height: 320px;
overflow-y: auto;
scrollbar-width: thin;
scrollbar-color: rgba(124,77,255,0.3) transparent;
```

Result item `.fs-result-item`:
```css
display: flex;
flex-direction: column;
gap: 5px;
padding: 12px 16px;
min-height: 64px;        /* guarantees ≥ 48px touch target with padding */
border-bottom: 1px solid rgba(255,255,255,0.05);
cursor: pointer;
transition: background 0.15s ease;
/* hover: */
background: rgba(124,77,255,0.08);
```

`.fs-result-item:last-child { border-bottom: none; }`

Food name `.fs-result-name`:
```css
font-size: 13px;
font-weight: 600;
color: var(--white);
line-height: 1.35;
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
```

Meta row `.fs-result-meta`:
```css
display: flex;
align-items: center;
gap: 6px;
flex-wrap: wrap;
```

Per-100g label `.fs-per-100g-label`:
```css
font-size: 10px;
font-weight: 700;
color: rgba(255,255,255,0.28);
text-transform: uppercase;
letter-spacing: 0.06em;
margin-right: 2px;
```

Macro chips inside results: reuse existing `.macro-chip.protein`, `.macro-chip.carbs`, `.macro-chip.fats` classes (defined in `nutrition-tab.component.css`). Font-size: 10px.

Serving size hint `.fs-result-serving`:
```css
font-size: 11px;
font-weight: 400;
color: rgba(255,255,255,0.30);
font-style: italic;
```
Only rendered if `result.servingSize` is non-null. Prefix with `mat-icon` `straighten` (10px, same colour).

Manual hint bar `.fs-manual-hint` (pinned at bottom of dropdown):
```css
padding: 10px 16px;
border-top: 1px solid rgba(255,255,255,0.06);
font-size: 12px;
color: rgba(255,255,255,0.35);
background: rgba(255,255,255,0.02);
text-align: center;
```
Text: `"Not found? Enter manually below ↓"`

"Enter manually" row `.fs-manual-btn-row`:
```css
display: flex;
justify-content: flex-end;
margin-top: 4px;
```

"Enter manually" button `.fs-manual-link`:
```css
background: none;
border: none;
font-size: 12px;
font-weight: 500;
color: rgba(255,255,255,0.40);
text-decoration: underline;
cursor: pointer;
padding: 4px 0;
font-family: inherit;
min-height: 32px;         /* for touch; row is secondary action */
transition: color 0.15s;
```
Hover: `color: rgba(255,255,255,0.70)`

---

**States**

**Default / Idle (no query, no selection):**
- Search input shows placeholder, prefix icon = `search`
- Dropdown hidden
- "Enter manually" link visible below the field
- Macro fields (grams, calories, protein, carbs, fats) remain visible below
  — user can fill them at any time without using search

**Typing (query < 2 chars):**
- Dropdown remains hidden
- No API call is fired

**Loading (query ≥ 2 chars, debounce fired, awaiting response):**
- Dropdown opens immediately
- Show `.fs-skeleton-list` with 3 rows:
  ```css
  .fs-skeleton-row {
    height: 56px;
    margin: 0 16px;
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    animation: pulse 1.6s ease-in-out infinite;
  }
  .fs-skeleton-row + .fs-skeleton-row { margin-top: 8px; }
  ```
  Rows wrapped in `.fs-skeleton-list { padding: 12px 0; display: flex; flex-direction: column; gap: 0; }`

**Results loaded (results.length > 0):**
- Dropdown shows `.fs-result-list` with up to 10 items
- `.fs-manual-hint` bar pinned at bottom

**Empty (results.length === 0, query ≥ 2 chars, not loading):**
- Dropdown shows `.fs-empty-state`:
  ```
  [mat-icon] restaurant_menu — 32px, rgba(255,255,255,0.18), centered
  [p] "No results for "[query]""  — 13px, rgba(255,255,255,0.35), centered
  [p] Try English: "chicken breast", "brown rice", "banana"
      — 12px, rgba(255,255,255,0.28), centered, font-style: italic
  ```
  ```css
  .fs-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 24px 20px;
    text-align: center;
  }
  ```
  The `.fs-manual-hint` bar is still shown below the empty state.

**Selected (user tapped a result):**
- Dropdown closes
- Search input value = selected food name (truncated with `text-overflow: ellipsis`)
- Prefix icon changes to `check_circle` in `#4ade80`
- `mat-suffix` clear button (`close` icon) appears
- All macro fields in the parent `.ex-item` card patch automatically
- `.fs-manual-btn-row` still visible below — user can clear and re-search

**Cleared (user taps × suffix):**
- Resets to Default/Idle state
- Clears `selected` and `basePerHundred` signals
- Macro fields are NOT cleared — user keeps what they had
- Input gets focus ready to search again

---

**Smart Grams Scaling**

When a USDA food is selected:
1. Store per-100g values in `basePerHundred` signal
2. Emit `foodSelected` with the `FoodSearchResult`
3. Parent patches form item with: `grams=100, calories=result.calories, protein_g=result.protein_g, carbs_g=result.carbs_g, fats_g=result.fat_g`
4. Parent watches the `grams` control value changes for that item via `valueChanges`
5. On grams change: if `basePerHundred` is non-null → recalculate:
   ```typescript
   const factor = newGrams / 100;
   patchValue({
     calories:  +(base.cal * factor).toFixed(1),
     protein_g: +(base.p   * factor).toFixed(1),
     carbs_g:   +(base.c   * factor).toFixed(1),
     fats_g:    +(base.f   * factor).toFixed(1),
   });
   ```
6. If user manually edits any macro field: `basePerHundred` is cleared (signal set to null)
   — no more auto-scaling; user is now in manual mode for that item

Recent food selections do NOT trigger scaling (values are already gram-scaled).

---

**Interactions**

| Trigger | Behaviour |
|---|---|
| Input focus | If has existing query but no selection → reopen dropdown |
| Input value change | 300ms debounce → if ≥ 2 chars → `searchFoods(query)` |
| Click outside `.fs-wrap` | Close dropdown via `@HostListener('document:click')` |
| Tap result row | Emit `foodSelected`, close dropdown, update input display |
| Tap `×` suffix | Clear selection, reset input, refocus input |
| Tap "Enter manually" link | Emit `manualMode`, close dropdown, blur search input, let parent focus grams field |
| Escape key | Close dropdown, maintain current input value |

**Transition for dropdown open/close:**
- Open: `animation: slideUp 0.2s ease-out` (existing keyframe)
- Close: `opacity 0, translateY 4px, 0.15s ease` — use `@if` with `showDropdown` signal

---

**Angular Material Components to Use**

- `mat-form-field appearance="outline"` — search input container
- `mat-icon matPrefix` — search / check_circle prefix
- `mat-icon-button matSuffix` — clear button (36×36px)
- `mat-icon` — all icons inside result items and empty state
- `mat-progress-bar` is NOT used here (skeleton is CSS-only for lighter weight)

---

**CSS Classes to Reuse (from existing files)**

From `styles.css` (global):
- `.macro-chip`, `.macro-chip.protein`, `.macro-chip.carbs`, `.macro-chip.fats` — macro badges in results

From `nutrition-tab.component.css` (parent scope, not directly available in child):
- These classes are redefined locally in `food-search.component.css` at the same spec

**New classes (defined in `food-search.component.css`):**
- `.fs-wrap` — position: relative container
- `.fs-dropdown` — absolute overlay panel
- `.fs-skeleton-list` — skeleton container
- `.fs-skeleton-row` — individual skeleton pulse row
- `.fs-result-list` — results container
- `.fs-result-item` — single result row (hover state)
- `.fs-result-name` — food name text
- `.fs-result-meta` — macro chips row
- `.fs-per-100g-label` — "PER 100G" label
- `.fs-result-serving` — serving size hint
- `.fs-empty-state` — no results panel
- `.fs-manual-hint` — "Not found?" bar at bottom of dropdown
- `.fs-manual-btn-row` — row below the form field
- `.fs-manual-link` — "Enter manually" text button

---

**Responsiveness**

Desktop (> 640px):
- Dropdown max-height: 320px, scrollable
- Result items: name + meta on two lines, serving size if available

Tablet (≤ 768px):
- No layout changes; dropdown still overlays fine within modal

Mobile (≤ 640px) — modal becomes bottom sheet:
- Dropdown max-height: 260px (less vertical space in sheet)
- Result item: 60px min-height
- Serving size hint hidden (`display: none` at ≤ 480px) to keep rows compact
- Macro chips stay: P / C / F are essential information

---

#### 3. RecentFoodsListComponent

**File:** `features/user/nutrition-tab/recent-foods/recent-foods.component.ts`
**Selector:** `app-recent-foods`
**Placement:** Inside the Food Items `<div class="section">`, immediately after the `<div class="sec-head">`, before `<div formArrayName="items">`

**Inputs / Outputs:**
```typescript
@Output() foodSelected = new EventEmitter<RecentFoodItem>();
```

**Internal Signals (via facade):**
```typescript
// reads from NutritionTabFacade:
recentFoods    = this.facade.recentFoods;      // Signal<RecentFoodItem[]>
recentLoading  = this.facade.recentLoading;    // Signal<boolean>
```

`loadRecentFoods()` called on `ngOnInit` via facade.

**Visibility rule:** If `recentFoods().length === 0 && !recentLoading()` → the entire component renders nothing (no DOM element). Use `@if` in parent or inside component root.

---

**Layout**

```
[.rf-section]
  [.rf-header]
    [mat-icon] schedule — 14px, rgba(255,255,255,0.30)
    [span.rf-label] "RECENTLY USED"
  [.rf-scroll-track]  ← overflow-x: auto, scrollbar hidden
    [.rf-chip-list]  ← horizontal flex, no-wrap
      [.rf-chip × N]
        [.rf-chip-name] "Chicken breast"
        [.rf-chip-cal] "180 kcal"
      [.rf-skeleton-chip × 4]  ← loading state only
```

---

**Visual Spec**

Section wrapper `.rf-section`:
```css
margin-bottom: 14px;
animation: slideUp 0.3s ease-out;
```

Header `.rf-header`:
```css
display: flex;
align-items: center;
gap: 5px;
margin-bottom: 10px;
```

Label `.rf-label`:
```css
font-size: 10px;
font-weight: 700;
color: rgba(255,255,255,0.30);
text-transform: uppercase;
letter-spacing: 0.08em;
```

Scroll track `.rf-scroll-track`:
```css
overflow-x: auto;
-webkit-overflow-scrolling: touch;
scrollbar-width: none;        /* Firefox */
-ms-overflow-style: none;     /* IE/Edge */
padding-bottom: 4px;          /* prevent chip shadow clipping */
```
`.rf-scroll-track::-webkit-scrollbar { display: none; }`

Chip list `.rf-chip-list`:
```css
display: flex;
flex-direction: row;
gap: 8px;
flex-wrap: nowrap;
align-items: center;
```

Recent food chip `.rf-chip`:
```css
display: inline-flex;
flex-direction: column;
align-items: flex-start;
gap: 2px;
padding: 8px 14px;
min-height: 52px;               /* touch target ≥ 48px */
min-width: 100px;
max-width: 180px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.09);
border-radius: 12px;
cursor: pointer;
flex-shrink: 0;
transition:
  background 0.15s ease,
  border-color 0.15s ease,
  transform 0.15s ease;
white-space: nowrap;
overflow: hidden;
```

Chip hover:
```css
background: rgba(124,77,255,0.10);
border-color: rgba(124,77,255,0.30);
transform: translateY(-2px);
```

Chip active/press:
```css
transform: translateY(0);
background: rgba(124,77,255,0.16);
```

Chip name `.rf-chip-name`:
```css
font-size: 13px;
font-weight: 600;
color: var(--white-soft);
overflow: hidden;
text-overflow: ellipsis;
max-width: 152px;     /* leave room for padding */
```

Chip calorie `.rf-chip-cal`:
```css
font-size: 11px;
font-weight: 500;
color: rgba(255,255,255,0.38);
```
Format: `"{{ item.calories | number:'1.0-0' }} kcal"`

Source badge (optional, inside chip, below calorie):
Only render if `item.source === 'search'` or `item.source === 'ai_analyzer'`:
```css
.rf-chip-source {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 4px;
  padding: 1px 5px;
  margin-top: 1px;
}
/* USDA search origin */
.rf-chip-source.search {
  background: rgba(124,77,255,0.14);
  color: #a78bfa;
}
/* AI analyzer origin */
.rf-chip-source.ai {
  background: rgba(74,222,128,0.10);
  color: #4ade80;
}
```
- `source === 'search'` → text: `"USDA"`
- `source === 'ai_analyzer'` → text: `"AI"`
- `source === 'manual'` or `null` → no badge rendered

---

**States**

**Loading:**
- Show 4 skeleton chips (width 120px, height 52px) in place of real chips:
  ```css
  .rf-skeleton-chip {
    width: 120px;
    height: 52px;
    border-radius: 12px;
    background: rgba(255,255,255,0.04);
    flex-shrink: 0;
    animation: pulse 1.6s ease-in-out infinite;
  }
  /* stagger via nth-child delays */
  .rf-skeleton-chip:nth-child(2) { animation-delay: 0.1s; }
  .rf-skeleton-chip:nth-child(3) { animation-delay: 0.2s; }
  .rf-skeleton-chip:nth-child(4) { animation-delay: 0.3s; }
  ```
  These appear in `.rf-chip-list` in place of `.rf-chip` elements.

**Empty (no recent foods):**
- Do not render the component at all (`@if (recentFoods().length > 0 || recentLoading())`)
- Silence is correct: first-time users see the search field without noise

**Loaded (1–10 recent foods):**
- Show chips. Up to 10 chips, all horizontally scrollable.
- Rightmost chip has a `margin-right: 4px` buffer so shadow isn't clipped by scroll track

**Error (network failure on /api/nutrition/foods/recent):**
- Log silently. Render nothing (same as empty). Recent foods is non-critical.
- Do NOT show an error banner for this — it would alarm users for a secondary feature.

---

**Interactions**

| Trigger | Behaviour |
|---|---|
| Tap chip | Emit `foodSelected(item: RecentFoodItem)` |
| Parent receives event | Appends new food item card (calls `addItem()`) then patches the new FormGroup with `{name, grams, calories, protein_g, carbs_g, fats_g, source: 'recent'}` |
| Horizontal scroll | Native, momentum-based, no custom scroll logic |
| Keyboard (focus chip) | `Enter` or `Space` triggers `foodSelected` (role="button" on each chip) |

---

**Angular Material Components to Use**

- `mat-icon` — `schedule` in header, no other Material components needed here
- No `mat-button` — chips are custom for precise control over size and style

---

**CSS Classes to Reuse**

- None from global styles — all classes are local (`.rf-*` prefix)
- `.macro-chip.*` classes are NOT used in recent foods chips (keep chips minimal)

**New classes (defined in `recent-foods.component.css`):**
- `.rf-section`, `.rf-header`, `.rf-label`
- `.rf-scroll-track`, `.rf-chip-list`
- `.rf-chip`, `.rf-chip-name`, `.rf-chip-cal`, `.rf-chip-source`
- `.rf-skeleton-chip`

---

**Responsiveness**

Desktop (> 640px):
- Up to 10 chips visible / scrollable. Chip list is the full modal width.
- Max 5 chips visible without scrolling at modal width (~680px)

Mobile (≤ 640px):
- Horizontal scroll works naturally with touch swipe
- Chips: `min-width: 90px; max-width: 150px; padding: 7px 12px`
- Chip name max 2 lines allowed: `-webkit-line-clamp: 2`

---

#### 4. Integration Changes in `nutrition-tab.component.html`

The Food Items section template becomes:

```html
<!-- Food items -->
<div class="section">
  <div class="sec-head"><mat-icon>set_meal</mat-icon><span>Food Items</span></div>

  <!-- Fix 1: Recent Foods — shown only if user has history -->
  @if (recentFoods().length > 0 || recentLoading()) {
    <app-recent-foods
      (foodSelected)="onRecentFoodSelected($event)"
    />
  }

  <!-- Fix 1: Food item cards now use FoodSearchComponent per item -->
  <div formArrayName="items" class="ex-list">
    @for (item of items.controls; track $index; let i = $index) {
      <div class="ex-item" [formGroupName]="i">
        <div class="ex-top">
          <div class="ex-badge">{{ i + 1 }}</div>
          <span class="ex-label">Food item {{ i + 1 }}</span>
          <button type="button" class="icon-btn-round small danger"
            (click)="removeItem(i)" [disabled]="items.length <= 1">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Fix 1: FoodSearchComponent replaces the "Food name" mat-form-field -->
        <app-food-search
          [initialValue]="item.get('name')?.value"
          [itemIndex]="i"
          (foodSelected)="onFoodSelected($event, i)"
          (manualMode)="onManualMode(i)"
        />

        <!-- Grams + macros fields remain — autofill or manual -->
        <div class="grid-2 tight" style="margin-top: 10px;">
          <!-- grams, calories, protein, carbs, fats fields — unchanged -->
        </div>
      </div>
    }
  </div>

  <!-- Live totals — unchanged -->
  ...

  <!-- Add food item — unchanged -->
  <button type="button" class="btn-add-ex" (click)="addItem()">
    <mat-icon>add_circle_outline</mat-icon>Add food item
  </button>
</div>
```

---

#### 5. New Methods in `nutrition-tab.component.ts`

```typescript
// Fix 1 — food search selection (USDA result)
onFoodSelected(result: FoodSearchResult, index: number): void {
  const group = this.items.at(index);
  group.patchValue({
    name:      result.name,
    grams:     100,
    calories:  +result.calories.toFixed(1),
    protein_g: +result.protein_g.toFixed(1),
    carbs_g:   +result.carbs_g.toFixed(1),
    fats_g:    +result.fat_g.toFixed(1),
    source:    'search',
  });
  // Store per-100g base on component for smart scaling (delegated to FoodSearchComponent)
}

// Fix 1 — recent food chip tapped
onRecentFoodSelected(item: RecentFoodItem): void {
  this.addItem();
  const group = this.items.at(this.items.length - 1);
  group.patchValue({
    name:      item.name,
    grams:     item.grams,
    calories:  item.calories,
    protein_g: item.protein_g,
    carbs_g:   item.carbs_g,
    fats_g:    item.fats_g,
    source:    'recent',
  });
}

// Fix 1 — user chose "Enter manually" in search
onManualMode(index: number): void {
  // Focus the grams field of that item — search field is now free-text name input
  // No state change needed beyond FoodSearchComponent closing its dropdown
}
```

`source` field must be added to `buildItemGroup()`:
```typescript
private buildItemGroup(): FormGroup {
  return this.fb.group({
    name:      ...,
    grams:     ...,
    calories:  ...,
    protein_g: ...,
    carbs_g:   ...,
    fats_g:    ...,
    source:    this.fb.control<string | null>(null),  // Fix 1: track origin
  });
}
```

`save()` must include `source` in the items map:
```typescript
items: (raw.items as any[]).map(i => ({
  name:      i.name,
  grams:     Number(i.grams),
  calories:  Number(i.calories),
  protein_g: Number(i.protein_g),
  carbs_g:   Number(i.carbs_g),
  fats_g:    Number(i.fats_g),
  source:    i.source ?? null,   // Fix 1
})),
```

---

### Facade Changes (`nutrition-tab.facade.ts`)

New signals to add:
```typescript
recentFoods    = signal<RecentFoodItem[]>([]);
recentLoading  = signal(false);
searchResults  = signal<FoodSearchResult[]>([]);
searchLoading  = signal(false);
```

New methods to add:
```typescript
async loadRecentFoods(): Promise<void> {
  this.recentLoading.set(true);
  try {
    const foods = await this.nutritionService.getRecentFoods();
    this.recentFoods.set(foods);
  } catch {
    // silent — not critical; recentFoods stays []
  } finally {
    this.recentLoading.set(false);
  }
}

async searchFoods(query: string): Promise<FoodSearchResult[]> {
  this.searchLoading.set(true);
  try {
    const results = await this.nutritionService.searchFoods(query);
    this.searchResults.set(results);
    return results;
  } catch {
    this.searchResults.set([]);
    return [];
  } finally {
    this.searchLoading.set(false);
  }
}

clearSearch(): void {
  this.searchResults.set([]);
}
```

`loadRecentFoods()` called in `NutritionTabComponent.ngOnInit()` alongside `loadMeals()`.

---

### Accessibility

| Element | ARIA / behaviour |
|---|---|
| `.fs-wrap` | No role — it's a form field group |
| Search `<input>` | `aria-label="Search food database for item {{ itemIndex + 1 }}"` |
| `.fs-dropdown` | `role="listbox"` when visible; `aria-label="Food search results"` |
| `.fs-result-item` | `role="option"` ; `aria-label="{{ result.name }}, {{ result.calories }} kcal per 100 grams, P {{ result.protein_g }}g C {{ result.carbs_g }}g F {{ result.fat_g }}g"` |
| `.fs-skeleton-row` | `aria-hidden="true"` |
| `.fs-empty-state` | `role="status"` ; `aria-live="polite"` |
| `.fs-manual-link` | `aria-label="Enter food {{ itemIndex + 1 }} details manually"` |
| `.rf-chip` | `role="button"` ; `tabindex="0"` ; `aria-label="{{ item.name }}, {{ item.calories }} kcal, tap to add"` |
| `.rf-skeleton-chip` | `aria-hidden="true"` |
| `×` clear suffix button | `aria-label="Clear selected food"` |

**Tab order inside each `.ex-item` card:**
1. Food search input (FoodSearchComponent)
2. Search results (if dropdown open): result items in order
3. Grams field
4. Calories field
5. Protein field
6. Carbs field
7. Fats field
8. Remove item button

**Touch target audit:**
- `.rf-chip`: `min-height: 52px` ✓ (> 48px)
- `.fs-result-item`: `min-height: 64px` ✓ (> 48px)
- `.fs-manual-link`: `min-height: 32px` — acceptable as secondary action; row has 44px+ total tap area with adjacent whitespace
- Clear suffix button: `36×36px` with ripple — acceptable; accessed after deliberate selection

**Focus management:**
- When dropdown closes after selection: focus moves to the grams `<input>` of that food item card
- When "Enter manually" is tapped: focus moves to the grams `<input>` of that item
- When a recent food chip is tapped: new card appended, focus moves to the search input of the new card

**Keyboard shortcuts:**
- `Escape` inside search input → closes dropdown
- `ArrowDown` → moves focus into dropdown result list
- `ArrowUp/Down` inside dropdown → moves between result items
- `Enter` on focused result item → selects it (same as tap)
- `Enter` / `Space` on `.rf-chip` → triggers `foodSelected`

---

### Animation Summary

| Element | Animation | Keyframe |
|---|---|---|
| `.fs-dropdown` open | `slideUp 0.2s ease-out` | Existing `slideUp` |
| `.fs-dropdown` close | `opacity 0.15s ease` + `translateY(-4px)` | CSS transition only |
| `.rf-section` entrance | `slideUp 0.3s ease-out` | Existing `slideUp` |
| `.rf-chip` hover | `translateY(-2px) 0.15s ease` | CSS transition |
| `.fs-result-item` hover | `background change 0.15s ease` | CSS transition |
| Skeleton rows/chips | `pulse 1.6s ease-in-out infinite` | Existing `pulse` |
| Check icon on selection | `fadeIn 0.18s ease` | Existing `fadeIn` |

---

### Source Tracking Summary

| User action | `source` value sent to API |
|---|---|
| Picked from USDA search | `"search"` |
| Picked from Recent Foods | `"recent"` |
| Typed manually / no search | `"manual"` |
| Filled by AI meal analyzer | `"ai_analyzer"` (set by AI analyzer, not this spec) |
| Legacy / null | `null` |

---

### Implementation Checklist (`@angular-developer`)

**Models:**
- [ ] Add `source?: string` to `FoodItem` interface in `core/models/nutrition-tab.model.ts`
- [ ] Add `FoodSearchResult` interface
- [ ] Add `RecentFoodItem` interface

**API Service (`api/nutrition-tab.service.ts`):**
- [ ] Add `searchFoods(query: string): Promise<FoodSearchResult[]>` → `GET /api/nutrition/foods/search?q=${query}`
- [ ] Add `getRecentFoods(): Promise<RecentFoodItem[]>` → `GET /api/nutrition/foods/recent`

**Facade (`core/facade/nutrition-tab.facade.ts`):**
- [ ] Add `recentFoods`, `recentLoading`, `searchResults`, `searchLoading` signals
- [ ] Add `loadRecentFoods()`, `searchFoods(query)`, `clearSearch()` methods

**New Components:**
- [ ] Create `features/user/nutrition-tab/food-search/food-search.component.ts` — search input + results dropdown
- [ ] Create `features/user/nutrition-tab/food-search/food-search.component.html`
- [ ] Create `features/user/nutrition-tab/food-search/food-search.component.css`
- [ ] Create `features/user/nutrition-tab/recent-foods/recent-foods.component.ts`
- [ ] Create `features/user/nutrition-tab/recent-foods/recent-foods.component.html`
- [ ] Create `features/user/nutrition-tab/recent-foods/recent-foods.component.css`

**Existing Component (`nutrition-tab.component.ts`):**
- [ ] Add `source` control to `buildItemGroup()`
- [ ] Add `onFoodSelected(result, index)` handler
- [ ] Add `onRecentFoodSelected(item)` handler
- [ ] Add `onManualMode(index)` handler
- [ ] Include `source` in `save()` items mapping
- [ ] Call `facade.loadRecentFoods()` in `ngOnInit()`
- [ ] Import `FoodSearchComponent` and `RecentFoodsComponent` in `imports[]`

**Existing Template (`nutrition-tab.component.html`):**
- [ ] Add `<app-recent-foods>` above `formArrayName="items"` div (with `@if` guard)
- [ ] Replace span-2 "Food name" `mat-form-field` with `<app-food-search>` inside each `.ex-item`

**Smart Grams Scaling:**
- [ ] `FoodSearchComponent` stores `basePerHundred` signal after USDA selection
- [ ] Parent watches grams control changes and scales macros if `basePerHundred` is set
- [ ] Manual edit of any macro field clears `basePerHundred`
