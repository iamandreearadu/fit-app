import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  HostListener,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';
import { DashboardFacade } from '../../../core/facade/dashboard.facade';
import { MealMacros } from '../../../core/models/meal-macros';
import { MealType } from '../../../core/models/nutrition-tab.model';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { AlertService } from '../../../shared/services/alert.service';
import { AiMealAnalyzerComponent } from '../daily-user-data/ai-meal-analyzer/ai-meal-analyzer.component';
import { CanLeaveAnalyzeMeal } from './analyze-meal-exit.guard';
import { TopBarActionService } from '../../../shared/services/top-bar-action.service';

@Component({
  selector: 'app-analyze-meal-page',
  standalone: true,
  imports: [HeaderComponent, MaterialModule, AiMealAnalyzerComponent],
  templateUrl: './analyze-meal-page.component.html',
  styleUrl: './analyze-meal-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyzeMealPageComponent implements CanLeaveAnalyzeMeal, OnDestroy {
  private readonly router = inject(Router);
  private readonly dashboardFacade = inject(DashboardFacade);
  private readonly alerts = inject(AlertService);
  private readonly topBarAction = inject(TopBarActionService);
  private readonly topBarActionId = 'analyze-meal-reset';

  @ViewChild(AiMealAnalyzerComponent)
  analyzer?: AiMealAnalyzerComponent;
  @ViewChild('leaveKeepButton')
  private leaveKeepButton?: ElementRef<HTMLButtonElement>;

  readonly persistenceError = signal<string | null>(null);
  readonly leaveConfirmationOpen = signal(false);
  private completed = false;
  private leaveResolver: ((allow: boolean) => void) | null = null;
  private readonly returnUrl = this.readReturnUrl();

  constructor() {
    this.topBarAction.set({
      id: this.topBarActionId,
      icon: 'refresh',
      ariaLabel: 'Reset meal analysis',
      run: () => this.resetAnalysis(),
    });
    effect(() => {
      if (!this.leaveConfirmationOpen()) return;
      setTimeout(() => this.leaveKeepButton?.nativeElement.focus());
    });
  }

  ngOnDestroy(): void {
    this.topBarAction.clear(this.topBarActionId);
  }

  async addToToday(event: { macros: MealMacros; mealType: MealType }): Promise<void> {
    await this.persist(event, 'Meal added to today.');
  }

  async saveMeal(event: { macros: MealMacros; mealType: MealType }): Promise<void> {
    await this.persist(event, 'Meal saved to nutrition log.');
  }

  goBack(): void {
    void this.router.navigateByUrl(this.returnUrl);
  }

  resetAnalysis(): void {
    this.analyzer?.clear();
    this.persistenceError.set(null);
  }

  canLeavePage(): boolean | Promise<boolean> {
    if (this.completed || !this.analyzer?.hasUnsavedWork) return true;
    if (this.leaveResolver) return false;

    this.leaveConfirmationOpen.set(true);
    return new Promise<boolean>(resolve => {
      this.leaveResolver = resolve;
    });
  }

  keepEditing(): void {
    this.resolveLeave(false);
  }

  discardAndLeave(): void {
    this.resolveLeave(true);
  }

  @HostListener('window:beforeunload', ['$event'])
  preventAccidentalRefresh(event: BeforeUnloadEvent): void {
    if (this.completed || !this.analyzer?.hasUnsavedWork) return;
    event.preventDefault();
  }

  @HostListener('document:keydown.escape')
  closeLeaveConfirmationWithEscape(): void {
    if (this.leaveConfirmationOpen()) this.keepEditing();
  }

  private async persist(
    event: { macros: MealMacros; mealType: MealType },
    successMessage: string,
  ): Promise<void> {
    this.persistenceError.set(null);
    try {
      const saved = await this.dashboardFacade.saveAnalyzedMeal(
        event.macros,
        event.mealType,
      );
      if (!saved) {
        this.handlePersistenceFailure();
        return;
      }

      this.completed = true;
      this.alerts.success(successMessage);
      await this.router.navigateByUrl(this.returnUrl);
    } catch {
      this.handlePersistenceFailure();
    }
  }

  private handlePersistenceFailure(): void {
    this.persistenceError.set('The meal could not be saved. Your analysis is still here — please try again.');
    this.analyzer?.finishSaving();
  }

  private resolveLeave(allow: boolean): void {
    const resolve = this.leaveResolver;
    this.leaveResolver = null;
    this.leaveConfirmationOpen.set(false);
    resolve?.(allow);
  }

  private readReturnUrl(): string {
    const candidate = globalThis.history?.state?.returnUrl;
    return typeof candidate === 'string'
      && candidate.startsWith('/')
      && !candidate.startsWith('//')
      ? candidate
      : '/user-dashboard';
  }
}
