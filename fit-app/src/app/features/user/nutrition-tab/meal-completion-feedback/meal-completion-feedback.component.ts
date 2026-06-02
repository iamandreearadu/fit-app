import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NutritionTabFacade } from '../../../../core/facade/nutrition-tab.facade';
import { MealEntry } from '../../../../core/models/nutrition-tab.model';
import { ShareToSocialBottomSheetComponent } from '../../../../shared/components/share-to-social-bottom-sheet/share-to-social-bottom-sheet.component';
import { ShareToSocialData } from '../../../../core/models/social.model';

@Component({
  selector: 'app-meal-completion-feedback',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './meal-completion-feedback.component.html',
  styleUrl: './meal-completion-feedback.component.css',
})
export class MealCompletionFeedbackComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) savedMeal!: MealEntry;
  @Output() dismissed = new EventEmitter<void>();

  protected readonly facade = inject(NutritionTabFacade);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly destroyRef = inject(DestroyRef);

  // ── Bar widths — reactive computed signals; CSS transition fires on change ──
  readonly proteinWidth = computed(() => {
    const p = this.facade.macroProgress();
    return p ? this.computeWidth(p.totalProtein, p.targetProtein) : '0%';
  });
  readonly carbsWidth = computed(() => {
    const p = this.facade.macroProgress();
    return p ? this.computeWidth(p.totalCarbs, p.targetCarbs) : '0%';
  });
  readonly fatWidth = computed(() => {
    const p = this.facade.macroProgress();
    return p ? this.computeWidth(p.totalFat, p.targetFat) : '0%';
  });

  // ── SVG ring animation (stroke-dashoffset goes 0 → 87.96 over 8s) ─────────
  readonly ringOffset = signal(0);

  // ── Dismiss state ─────────────────────────────────────────────────────────
  readonly isDismissing = signal(false);

  @ViewChild('ringArc') ringArcEl?: ElementRef<SVGCircleElement>;

  private autoTimer?: ReturnType<typeof setTimeout>;
  private animTimer?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    // Delay 50ms so the initial stroke-dashoffset: 0 paints before the
    // CSS transition to 87.96 starts — bar widths are handled by computed().
    this.animTimer = setTimeout(() => this.ringOffset.set(87.96), 50);
    this.autoTimer = setTimeout(() => this.dismiss(), 8000);
  }

  ngOnDestroy(): void {
    if (this.autoTimer) clearTimeout(this.autoTimer);
    if (this.animTimer) clearTimeout(this.animTimer);
  }

  // ── Share — opens ShareToSocialBottomSheetComponent (Fix 2) ──────────────
  onShare(): void {
    // Cancel the auto-dismiss timer so the feedback card doesn't disappear
    // while the user is composing a caption inside the share sheet.
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = undefined;
    }

    // PRIVACY: totalCalories / macro totals intentionally excluded from ShareToSocialData
    const shareData: ShareToSocialData = {
      type: 'meal',
      mealId: this.savedMeal.id,
      mealName: this.savedMeal.name,
      mealType: this.savedMeal.type,
    };

    this.bottomSheet
      .open(ShareToSocialBottomSheetComponent, {
        data: shareData,
        panelClass: 'share-sheet-panel',
        hasBackdrop: true,
      })
      .afterDismissed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Sheet closed (published or skipped) — collapse the feedback card.
        this.dismiss();
      });
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────
  dismiss(): void {
    if (this.isDismissing()) return;
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.isDismissing.set(true);
    setTimeout(() => this.dismissed.emit(), 300);
  }

  // ── Bar helpers ───────────────────────────────────────────────────────────
  private computeWidth(total: number, target: number): string {
    if (!target) return '0%';
    return `${Math.min((total / target) * 100, 100)}%`;
  }

  getPercent(total: number, target: number): string {
    if (!target) return '—';
    return `${Math.round((total / target) * 100)}%`;
  }

  isOverTarget(total: number, target: number): boolean {
    return target > 0 && total > target;
  }

  // ── No-targets guard ──────────────────────────────────────────────────────
  get noTargets(): boolean {
    const p = this.facade.macroProgress();
    return !p || (p.targetProtein === 0 && p.targetCarbs === 0 && p.targetFat === 0);
  }

  // ── Headline copy (highest-pct macro) ─────────────────────────────────────
  get headlineCopy(): string {
    const p = this.facade.macroProgress();
    if (!p) return 'Keep logging to see your daily progress.';

    const proteinPct = p.targetProtein > 0 ? Math.round((p.totalProtein / p.targetProtein) * 100) : 0;
    const carbsPct   = p.targetCarbs   > 0 ? Math.round((p.totalCarbs   / p.targetCarbs)   * 100) : 0;
    const fatPct     = p.targetFat     > 0 ? Math.round((p.totalFat     / p.targetFat)     * 100) : 0;

    if (!proteinPct && !carbsPct && !fatPct) return 'Keep logging to see your daily progress.';

    const sorted = [
      { label: 'protein', pct: proteinPct },
      { label: 'carbs',   pct: carbsPct },
      { label: 'fat',     pct: fatPct },
    ].sort((a, b) => b.pct - a.pct);

    const top = sorted[0];

    if (top.pct >= 100) {
      if (proteinPct >= 100 && carbsPct >= 100 && fatPct >= 100)
        return "You've hit all your macro goals today! 🎯";
      return `You've hit your ${top.label} goal for today!`;
    }
    if (top.pct >= 75)
      return `You've hit ${top.pct}% of your ${top.label} goal today — almost there!`;

    return `You've hit ${top.pct}% of your ${top.label} goal today.`;
  }

  // ── Aria label for the feedback card ─────────────────────────────────────
  get ariaLabel(): string {
    return `Meal saved. ${this.headlineCopy}`;
  }
}
