import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subject, switchMap, from, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NutritionTabFacade } from '../../../../core/facade/nutrition-tab.facade';
import { FoodSearchResult } from '../../../../core/models/nutrition-tab.model';

@Component({
  selector: 'app-food-search',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './food-search.component.html',
  styleUrl: './food-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodSearchComponent implements OnInit {
  /** Pre-fills the search input — pass existing food name when editing a meal. */
  @Input() initialValue: string = '';
  /** Used for accessible aria-labels to distinguish multi-item cards. */
  @Input() itemIndex: number = 0;

  /** Emits the selected USDA FoodSearchResult so the parent can autofill macros. */
  @Output() foodSelected = new EventEmitter<FoodSearchResult>();
  /** Emits when the user clicks "Enter manually" — parent closes dropdown focus hint. */
  @Output() manualMode = new EventEmitter<void>();
  /** Emits the current input value on every user keystroke — used to sync parent form name. */
  @Output() nameChange = new EventEmitter<string>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  private readonly facade = inject(NutritionTabFacade);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // Internal signals
  readonly query = signal('');
  readonly results = signal<FoodSearchResult[]>([]);
  readonly searchLoading = signal(false);
  readonly showDropdown = signal(false);
  readonly selected = signal<FoodSearchResult | null>(null);

  /** Per-100g macro base — set after USDA selection; cleared on manual macro edit. */
  readonly basePerHundred = signal<{ cal: number; p: number; c: number; f: number } | null>(null);

  private readonly searchSubject$ = new Subject<string>();

  ngOnInit(): void {
    if (this.initialValue) this.query.set(this.initialValue);

    this.searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
      switchMap(q => {
        if (q.trim().length < 2) {
          this.results.set([]);
          this.showDropdown.set(false);
          this.searchLoading.set(false);
          return EMPTY;
        }
        this.searchLoading.set(true);
        this.showDropdown.set(true);
        return from(this.facade.searchFoods(q.trim()));
      }),
    ).subscribe(res => {
      this.results.set(res);
      this.searchLoading.set(false);
    });
  }

  onInputChange(value: string): void {
    this.query.set(value);
    this.nameChange.emit(value);
    // Only trigger search when no USDA food is selected (user is actively searching)
    if (!this.selected()) {
      if (value.trim().length >= 2) {
        this.showDropdown.set(true);
      } else {
        this.showDropdown.set(false);
      }
      this.searchSubject$.next(value);
    }
  }

  onInputFocus(): void {
    // Re-open dropdown if there are existing results and no selection yet
    if (!this.selected() && this.query().trim().length >= 2 && this.results().length > 0) {
      this.showDropdown.set(true);
    }
  }

  selectResult(result: FoodSearchResult): void {
    this.selected.set(result);
    this.basePerHundred.set({
      cal: result.calories,
      p: result.protein_g,
      c: result.carbs_g,
      f: result.fat_g,
    });
    this.query.set(result.name);
    this.showDropdown.set(false);
    this.foodSelected.emit(result);
    this.nameChange.emit(result.name);
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selected.set(null);
    this.basePerHundred.set(null);
    this.query.set('');
    this.results.set([]);
    this.showDropdown.set(false);
    this.nameChange.emit('');
    // Return focus to the search input
    setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 0);
  }

  onEnterManually(): void {
    this.showDropdown.set(false);
    this.manualMode.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.showDropdown.set(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusFirstResult();
        break;
    }
  }

  onResultKeydown(event: KeyboardEvent, result: FoodSearchResult): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectResult(result);
        break;
      case 'ArrowDown':
        event.preventDefault();
        (event.currentTarget as HTMLElement)
          ?.nextElementSibling instanceof HTMLElement &&
          ((event.currentTarget as HTMLElement).nextElementSibling as HTMLElement).focus();
        break;
      case 'ArrowUp': {
        event.preventDefault();
        const prev = (event.currentTarget as HTMLElement)?.previousElementSibling;
        if (prev instanceof HTMLElement) {
          prev.focus();
        } else {
          this.searchInputRef?.nativeElement?.focus();
        }
        break;
      }
      case 'Escape':
        this.showDropdown.set(false);
        this.searchInputRef?.nativeElement?.focus();
        break;
    }
  }

  private focusFirstResult(): void {
    const firstItem = (this.el.nativeElement as HTMLElement).querySelector<HTMLElement>('.fs-result-item');
    firstItem?.focus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.showDropdown.set(false);
    }
  }
}
