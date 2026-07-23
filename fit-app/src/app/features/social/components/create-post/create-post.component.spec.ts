import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CreatePostComponent } from './create-post.component';
import { SocialContentFacade } from '../../../../core/facade/social-content.facade';
import { WorkoutsTabService } from '../../../../api/workouts-tab.service';
import { WorkoutTemplate } from '../../../../core/models/workouts-tab.model';
import { NutritionTabService } from '../../../../api/nutrition-tab.service';
import { MealEntry } from '../../../../core/models/nutrition-tab.model';

describe('CreatePostComponent activity linking', () => {
  let fixture: ComponentFixture<CreatePostComponent>;
  let component: CreatePostComponent;
  let socialFacade: jasmine.SpyObj<SocialContentFacade>;
  let workoutsService: jasmine.SpyObj<WorkoutsTabService>;
  let nutritionService: jasmine.SpyObj<NutritionTabService>;

  const workout: WorkoutTemplate = {
    id: 42,
    uid: '42',
    title: 'Core Pilates',
    type: 'Other',
    durationMin: 45,
    caloriesEstimateKcal: 0,
    exercises: [{ name: 'The Hundred', sets: 3, reps: 20, weightKg: 0 }],
    isSystemTemplate: false,
  };
  const meal: MealEntry = { id: 7, name: 'Protein bowl', type: 'Lunch', date: '2026-07-22', items: [], totalGrams: 0, totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFats_g: 0, isHiddenFromProfile: true };

  beforeEach(async () => {
    socialFacade = jasmine.createSpyObj<SocialContentFacade>('SocialContentFacade', ['createPost']);
    socialFacade.createPost.and.resolveTo();
    workoutsService = jasmine.createSpyObj<WorkoutsTabService>('WorkoutsTabService', ['listSavedTemplates']);
    workoutsService.listSavedTemplates.and.resolveTo([workout]);
    nutritionService = jasmine.createSpyObj<NutritionTabService>('NutritionTabService', ['listMeals']);
    nutritionService.listMeals.and.resolveTo([meal]);

    await TestBed.configureTestingModule({
      imports: [CreatePostComponent],
      providers: [
        provideNoopAnimations(),
        { provide: SocialContentFacade, useValue: socialFacade },
        { provide: WorkoutsTabService, useValue: workoutsService },
        { provide: NutritionTabService, useValue: nutritionService },
        { provide: Location, useValue: jasmine.createSpyObj<Location>('Location', ['back']) },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']) },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    router.navigateByUrl.and.resolveTo(true);
    fixture = TestBed.createComponent(CreatePostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('loads saved workouts lazily and filters by title', fakeAsync(() => {
    component.openActivityPicker();
    tick();
    fixture.detectChanges();

    expect(workoutsService.listSavedTemplates).toHaveBeenCalledTimes(1);
    expect(component.filteredWorkouts()).toEqual([workout]);

    component.workoutSearch.set('missing');
    expect(component.filteredWorkouts()).toEqual([]);
  }));

  it('allows a post containing only a linked workout', fakeAsync(() => {
    component.openActivityPicker();
    tick();
    component.selectWorkout(workout);
    component.confirmWorkout();

    expect(component.canPost).toBeTrue();
  }));

  it('publishes the selected saved workout id', fakeAsync(() => {
    component.savedWorkouts.set([workout]);
    component.pendingWorkoutId.set(workout.id);
    component.confirmWorkout();

    component.submit();
    tick();

    expect(socialFacade.createPost).toHaveBeenCalledWith({ content: '', linkedWorkoutId: 42 });
  }));

  it('removes the linked workout without clearing the rest of the draft', () => {
    component.content.set('My training plan');
    component.selectedWorkout.set(workout);

    component.removeActivity();

    expect(component.selectedWorkout()).toBeNull();
    expect(component.content()).toBe('My training plan');
    expect(component.canPost).toBeTrue();
  });

  it('publishes an owned meal as the only post content', fakeAsync(() => {
    component.savedMeals.set([meal]);
    component.activityType.set('meal');
    component.pendingMealId.set(meal.id);
    component.confirmActivity();
    component.submit();
    tick();
    expect(socialFacade.createPost).toHaveBeenCalledWith({ content: '', linkedMealId: 7 });
  }));
});
