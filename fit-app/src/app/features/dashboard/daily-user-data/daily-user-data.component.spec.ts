import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyUserDataComponent } from './daily-user-data.component';
import { TEST_PROVIDERS } from '../../../testing/test-providers';

describe('DailyUserDataComponent', () => {
  let component: DailyUserDataComponent;
  let fixture: ComponentFixture<DailyUserDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyUserDataComponent], providers: TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyUserDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('adds a manual entry only to today when the primary action is used', async () => {
    const facade = (component as any).facade;
    const saveMeal = spyOn(facade, 'saveMeal').and.callFake(async (payload: any) => payload);
    spyOn(facade, 'loadTodaySummary').and.resolveTo();
    component.showManualMacrosOverlay = true;
    component.manualMacrosForm.setValue({
      name: 'Lunch',
      type: 'Lunch',
      protein: 30,
      carbs: 40,
      fats: 12,
    });

    await component.saveManualMacros();

    expect(saveMeal).toHaveBeenCalledOnceWith(jasmine.objectContaining({ isSavedMeal: false }));
    expect(component.showManualMacrosOverlay).toBeFalse();
  });

  it('creates a saved meal template only when Save meal is used', async () => {
    const facade = (component as any).facade;
    const saveMeal = spyOn(facade, 'saveMeal').and.callFake(async (payload: any) => payload);
    component.showManualMacrosOverlay = true;
    component.manualMacrosForm.setValue({
      name: 'Reusable lunch',
      type: 'Lunch',
      protein: 30,
      carbs: 40,
      fats: 12,
    });

    await component.saveManualMeal();

    expect(saveMeal).toHaveBeenCalledOnceWith(jasmine.objectContaining({ isSavedMeal: true }));
    expect(component.showManualMacrosOverlay).toBeTrue();
  });
});
