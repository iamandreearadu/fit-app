import { TestBed } from '@angular/core/testing';
import { NutritionTabService } from '../../api/nutrition-tab.service';
import { MealEntry } from '../models/nutrition-tab.model';
import { NutritionTabFacade } from './nutrition-tab.facade';

describe('NutritionTabFacade', () => {
  let facade: NutritionTabFacade;
  let service: jasmine.SpyObj<NutritionTabService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<NutritionTabService>('NutritionTabService', [
      'listMeals', 'addMeal', 'updateMeal', 'deleteMeal', 'getRecentFoods',
      'getTodayMacroProgress', 'searchFoods', 'listSavedMeals',
    ]);
    TestBed.configureTestingModule({
      providers: [NutritionTabFacade, { provide: NutritionTabService, useValue: service }],
    });
    facade = TestBed.inject(NutritionTabFacade);
  });

  it('loads meals and clears the loading state', async () => {
    const meals: MealEntry[] = [{
      id: 1, uid: '1', name: 'Lunch', type: 'Lunch', date: '2026-07-21', items: [],
      totalGrams: 0, totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFats_g: 0,
    }];
    service.listMeals.and.resolveTo(meals);

    await facade.loadMeals();

    expect(facade.meals).toEqual(meals);
    expect(facade.loading).toBeFalse();
  });

  it('exposes a load error and preserves the existing list', async () => {
    const existing: MealEntry[] = [{
      id: 1, name: 'Breakfast', type: 'Breakfast', date: '2026-07-21', items: [],
      totalGrams: 0, totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFats_g: 0,
    }];
    service.listMeals.and.resolveTo(existing);
    await facade.loadMeals();
    service.listMeals.and.rejectWith(new Error('network'));

    await facade.loadMeals();

    expect(facade.error()).toBe('Failed to load meals. Please try again.');
    expect(facade.meals).toEqual(existing);
  });

  it('deletes only meals from the requested date', async () => {
    const meals: MealEntry[] = [
      {
        id: 1, uid: '1', name: 'Breakfast', type: 'Breakfast', date: '2026-07-21', items: [],
        totalGrams: 0, totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFats_g: 0,
      },
      {
        id: 2, uid: '2', name: 'Dinner', type: 'Dinner', date: '2026-07-20', items: [],
        totalGrams: 0, totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFats_g: 0,
      },
    ];
    service.listMeals.and.resolveTo(meals);
    service.deleteMeal.and.resolveTo(true);

    const result = await facade.deleteMealsForDate('2026-07-21');

    expect(result).toBeTrue();
    expect(service.deleteMeal).toHaveBeenCalledOnceWith('1', false);
    expect(facade.meals).toEqual([meals[1]]);
  });

  it('uses explicitly saved meals when the backend returns templates', async () => {
    const dailyMeal: MealEntry = {
      id: 1, uid: '1', name: 'Lunch', type: 'Lunch', date: '2026-07-23', items: [],
      totalGrams: 0, totalCalories: 400, totalProtein_g: 20, totalCarbs_g: 40,
      totalFats_g: 10, isSavedMeal: false,
    };
    const savedMeal: MealEntry = {
      ...dailyMeal, id: 2, uid: '2', name: 'Reusable lunch', isSavedMeal: true,
    };
    service.listMeals.and.resolveTo([dailyMeal]);
    service.listSavedMeals.and.resolveTo([savedMeal]);
    await facade.loadMeals();

    await facade.loadSavedMeals();

    expect(facade.meals).toEqual([savedMeal, dailyMeal]);
  });
});
