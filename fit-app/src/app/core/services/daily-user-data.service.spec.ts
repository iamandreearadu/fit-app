import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DailyUserDataService } from './daily-user-data.service';
import { UserMetricsService } from './user-metrics.service';

describe('DailyUserDataService', () => {
  let service: DailyUserDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DailyUserDataService,
        {
          provide: UserMetricsService,
          useValue: { metrics: signal(null) },
        },
      ],
    });

    service = TestBed.inject(DailyUserDataService);
  });

  it('uses the live burned-calorie value when the server summary is stale', () => {
    service.setDailyFromBackend({
      date: service.todayDate,
      caloriesIntake: 1741,
      caloriesBurned: 0,
    });
    service.setTodaySummary({
      date: service.todayDate,
      caloriesFromNutritionLog: 1741,
      proteinFromNutritionLog_g: 116,
      carbsFromNutritionLog_g: 200,
      fatsFromNutritionLog_g: 53,
      mealCount: 3,
      activityType: 'Strength Training',
      waterConsumedL: 0,
      steps: 0,
      stepTarget: 3000,
      caloriesBurned: 0,
      caloriesTotal: 1741,
      macrosPct: { protein: 116, carbs: 200, fats: 53 },
      updatedAt: new Date().toISOString(),
    });

    service.setCaloriesBurned(400);

    expect(service.stats().caloriesBurned).toBe(400);
    expect(service.stats().netCalories).toBe(1341);
  });

  it('allows net calories to represent a calorie deficit', () => {
    service.setDailyFromBackend({
      date: service.todayDate,
      caloriesIntake: 300,
      caloriesBurned: 500,
    });

    expect(service.stats().netCalories).toBe(-200);
  });
});
