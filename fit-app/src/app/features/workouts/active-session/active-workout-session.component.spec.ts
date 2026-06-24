import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActiveWorkoutSessionComponent } from './active-workout-session.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../../../core/material/material.module';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';
import { AlertService } from '../../../shared/services/alert.service';
import { signal, computed } from '@angular/core';

const mockTemplate = {
  uid: '1', id: 1, title: 'Pull Day A', type: 'Strength' as const,
  durationMin: 60, caloriesEstimateKcal: 350,
  exercises: [
    { name: 'Bench Press', sets: 3, reps: 8, weightKg: 80 },
    { name: 'Lat Pulldown', sets: 3, reps: 10, weightKg: 60 },
  ],
};

describe('ActiveWorkoutSessionComponent', () => {
  let component: ActiveWorkoutSessionComponent;
  let fixture: ComponentFixture<ActiveWorkoutSessionComponent>;
  let facadeSpy: jasmine.SpyObj<WorkoutsTabFacade>;

  beforeEach(async () => {
    const lastSessionSig = signal<any[]>([]);
    const completionSummarySig = signal<any>(null);
    const lastSessionMapComputed = computed(() => new Map());

    facadeSpy = jasmine.createSpyObj('WorkoutsTabFacade', [
      'getTemplate', 'loadLastSession', 'completeSession',
    ], {
      selectedTemplate: mockTemplate,
      lastSession: lastSessionSig,
      completionSummary: completionSummarySig,
      lastSessionMap: lastSessionMapComputed,
    });
    facadeSpy.getTemplate.and.returnValue(Promise.resolve());
    facadeSpy.loadLastSession.and.returnValue(Promise.resolve());
    facadeSpy.completeSession.and.returnValue(Promise.resolve({ sessionId: 1, templateTitle: 'Pull Day A', durationMin: 45, exerciseCount: 2, setsCompleted: 6, estimatedCaloriesKcal: 300, streakDay: 5, completedAt: new Date().toISOString() }));

    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutSessionComponent, MaterialModule, NoopAnimationsModule],
      providers: [
        { provide: WorkoutsTabFacade, useValue: facadeSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: AlertService, useValue: { error: jasmine.createSpy(), info: jasmine.createSpy(), success: jasmine.createSpy() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutSessionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create and load sections from template', () => {
    expect(component).toBeTruthy();
    expect(component.sections().length).toBe(2);
    expect(component.sections()[0].exercise.name).toBe('Bench Press');
    expect(component.sections()[0].sets.length).toBe(3);
  });

  it('totalSets and completedSets signals are correct initially', () => {
    expect(component.totalSets()).toBe(6);
    expect(component.completedSets()).toBe(0);
    expect(component.allComplete()).toBeFalse();
  });

  it('onSetCompleted marks the set as done and starts rest timer', () => {
    component.onSetCompleted(0, 0, { weightKg: 85, reps: 7 });
    expect(component.sections()[0].sets[0].completed).toBeTrue();
    expect(component.sections()[0].sets[0].weightKg).toBe(85);
    expect(component.restTimerVisible()).toBeTrue();
  });

  it('onSetDeleted removes the set from the section', () => {
    expect(component.sections()[0].sets.length).toBe(3);
    component.onSetDeleted(0, 0);
    expect(component.sections()[0].sets.length).toBe(2);
  });

  it('addSet appends a new set with last set values', () => {
    component.addSet(0);
    expect(component.sections()[0].sets.length).toBe(4);
  });

  it('skipRest hides rest timer', () => {
    component.onSetCompleted(0, 0, { weightKg: 80, reps: 8 });
    component.skipRest();
    expect(component.restTimerVisible()).toBeFalse();
  });

  it('addRestTime adds 30s to remaining', () => {
    component.onSetCompleted(0, 0, { weightKg: 80, reps: 8 });
    const before = component.restRemaining();
    component.addRestTime();
    expect(component.restRemaining()).toBe(before + 30);
  });

  it('allComplete is true when all sets are completed', () => {
    // Complete all 6 sets
    component.sections().forEach((s, si) => {
      s.sets.forEach((_, ri) => {
        component.onSetCompleted(si, ri, { weightKg: 60, reps: 8 });
      });
    });
    expect(component.allComplete()).toBeTrue();
  });
});
