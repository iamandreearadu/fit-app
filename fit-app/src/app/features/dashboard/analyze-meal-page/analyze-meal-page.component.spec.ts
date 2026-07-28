import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DashboardFacade } from '../../../core/facade/dashboard.facade';
import { AlertService } from '../../../shared/services/alert.service';
import { AnalyzeMealPageComponent } from './analyze-meal-page.component';
import { TopBarActionService } from '../../../shared/services/top-bar-action.service';

describe('AnalyzeMealPageComponent', () => {
  let component: AnalyzeMealPageComponent;
  let dashboardFacade: jasmine.SpyObj<DashboardFacade>;
  let router: jasmine.SpyObj<Router>;
  let alerts: jasmine.SpyObj<AlertService>;
  let topBarAction: TopBarActionService;

  beforeEach(() => {
    dashboardFacade = jasmine.createSpyObj<DashboardFacade>('DashboardFacade', ['saveAnalyzedMeal']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    alerts = jasmine.createSpyObj<AlertService>('AlertService', ['success']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardFacade, useValue: dashboardFacade },
        { provide: Router, useValue: router },
        { provide: AlertService, useValue: alerts },
      ],
    });

    component = TestBed.runInInjectionContext(() => new AnalyzeMealPageComponent());
    topBarAction = TestBed.inject(TopBarActionService);
  });

  it('allows leaving immediately when the analyzer is clean', () => {
    setAnalyzer({ hasUnsavedWork: false });
    expect(component.canLeavePage()).toBeTrue();
  });

  it('uses the dashboard return route from the desktop back action', () => {
    component.goBack();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/user-dashboard');
  });

  it('resets the analyzer and clears a persistence error', () => {
    const clear = jasmine.createSpy('clear');
    setAnalyzer({ hasUnsavedWork: true, clear });
    component.persistenceError.set('Save failed');

    component.resetAnalysis();

    expect(clear).toHaveBeenCalled();
    expect(component.persistenceError()).toBeNull();
  });

  it('resets the analyzer from the mobile top-bar action', () => {
    const clear = jasmine.createSpy('clear');
    setAnalyzer({ hasUnsavedWork: true, clear });

    topBarAction.trigger();

    expect(clear).toHaveBeenCalled();
  });

  it('keeps dirty analysis when the user cancels leaving', async () => {
    setAnalyzer({ hasUnsavedWork: true });
    const decision = component.canLeavePage() as Promise<boolean>;

    expect(component.leaveConfirmationOpen()).toBeTrue();
    component.keepEditing();

    await expectAsync(decision).toBeResolvedTo(false);
    expect(component.leaveConfirmationOpen()).toBeFalse();
  });

  it('allows leaving after discard confirmation', async () => {
    setAnalyzer({ hasUnsavedWork: true });
    const decision = component.canLeavePage() as Promise<boolean>;

    component.discardAndLeave();

    await expectAsync(decision).toBeResolvedTo(true);
  });

  it('persists an analyzed meal and returns to dashboard', async () => {
    dashboardFacade.saveAnalyzedMeal.and.resolveTo({ id: 10 } as never);

    await component.addToToday({
      macros: { protein_g: 20, carbs_g: 30, fats_g: 10, calories_kcal: 290 },
      mealType: 'Lunch',
    });

    expect(dashboardFacade.saveAnalyzedMeal).toHaveBeenCalled();
    expect(alerts.success).toHaveBeenCalledWith('Meal added to today.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/user-dashboard');
  });

  it('preserves the result and unlocks actions after a save failure', async () => {
    const finishSaving = jasmine.createSpy('finishSaving');
    setAnalyzer({ hasUnsavedWork: true, finishSaving });
    dashboardFacade.saveAnalyzedMeal.and.resolveTo(null);

    await component.saveMeal({
      macros: { protein_g: 20, carbs_g: 30, fats_g: 10, calories_kcal: 290 },
      mealType: 'Dinner',
    });

    expect(finishSaving).toHaveBeenCalled();
    expect(component.persistenceError()).toContain('could not be saved');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  function setAnalyzer(value: {
    hasUnsavedWork: boolean;
    finishSaving?: () => void;
    clear?: () => void;
  }): void {
    (component as unknown as { analyzer: typeof value }).analyzer = value;
  }
});
