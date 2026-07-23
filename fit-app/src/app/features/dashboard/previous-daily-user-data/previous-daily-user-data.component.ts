import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';
import { NutritionTabService } from '../../../api/nutrition-tab.service';
import { MealEntry, MealType } from '../../../core/models/nutrition-tab.model';

interface WeekGroup {
  start: Date;
  end: Date;
  days: DailyUserData[];
}

@Component({
  selector: 'app-previous-daily-user-data',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MaterialModule],
  templateUrl: './previous-daily-user-data.component.html',
  styleUrl: './previous-daily-user-data.component.css'
})
export class PreviousDailyUserDataComponent implements OnInit {

  public facade = inject(UserFacade);
  public workoutsTabFacade = inject(WorkoutsTabFacade);
  private nutritionService = inject(NutritionTabService);

  history = this.facade.history;

  selectedDay: DailyUserData | null = null;
  showModal = false;
  dayMeals = signal<MealEntry[]>([]);
  dayMealsLoading = signal(false);
  dayMealsError = signal(false);
  private mealLoadRequest = 0;

  readonly mealTypes: MealType[] = [
    'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'
  ];

  dayMealGroups = computed(() => this.mealTypes
    .map(type => ({ type, meals: this.dayMeals().filter(meal => meal.type === type) }))
    .filter(group => group.meals.length > 0));

  currentWeekIndex = signal(0);

  
 weeks = computed<WeekGroup[]>(() => {
  const days = [...this.history()]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const map = new Map<string, WeekGroup>();

  days.forEach(day => {
    const dateObj = new Date(day.date); 
    const monday = this.getMonday(dateObj);
    const key = monday.toISOString();

    if (!map.has(key)) {
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      map.set(key, {
        start: monday,
        end: sunday,
        days: []
      });
    }

    map.get(key)!.days.push(day);
  });

  const weeks = Array.from(map.values());
  // Show the most recent recorded day first within every week.
  weeks.forEach(w => w.days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  return weeks;
});


  currentWeek = computed(() =>
    this.weeks()[this.currentWeekIndex()] ?? null
  );


  ngOnInit(): void {
    this.facade.loadDailyHistory();
  }


  prevWeek() {
    if (this.currentWeekIndex() < this.weeks().length - 1) {
      this.currentWeekIndex.update(i => i + 1);
    }
  }

  nextWeek() {
    if (this.currentWeekIndex() > 0) {
      this.currentWeekIndex.update(i => i - 1);
    }
  }


  async openDay(day: DailyUserData) {
    this.selectedDay = day;
    this.showModal = true;
    this.dayMeals.set([]);
    this.dayMealsError.set(false);
    this.dayMealsLoading.set(true);

    const request = ++this.mealLoadRequest;
    try {
      const meals = await this.nutritionService.listMealsForDate(day.date);
      if (request === this.mealLoadRequest && this.showModal)
        this.dayMeals.set(meals);
    } catch {
      if (request === this.mealLoadRequest && this.showModal)
        this.dayMealsError.set(true);
    } finally {
      if (request === this.mealLoadRequest)
        this.dayMealsLoading.set(false);
    }
  }

  closeModal() {
    this.mealLoadRequest++;
    this.selectedDay = null;
    this.showModal = false;
    this.dayMeals.set([]);
    this.dayMealsLoading.set(false);
    this.dayMealsError.set(false);
  }

  resolveActivityLabel(activityType: string | undefined): string {
    if (!activityType) return '-';
    if (activityType.startsWith('workout:')) {
      const uid = activityType.replace('workout:', '');
      return this.workoutsTabFacade.templates.find(t => t.uid === uid)?.title ?? 'My Workout';
    }
    const labels: Record<string, string> = {
      'strength-training': 'Strength Training',
      'cardio': 'Cardio',
      'hiit-training': 'HIIT Training',
      'active-rest-day': 'Active Rest Day',
      'rest-day': 'Rest Day',
    };
    return labels[activityType] ?? activityType;
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    if (day !== 1) {
      d.setDate(d.getDate() - day + 1);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
