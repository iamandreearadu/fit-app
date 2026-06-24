import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WorkoutSetRowComponent } from './workout-set-row.component';
import { MaterialModule } from '../../../core/material/material.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('WorkoutSetRowComponent', () => {
  let component: WorkoutSetRowComponent;
  let fixture: ComponentFixture<WorkoutSetRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutSetRowComponent, MaterialModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutSetRowComponent);
    component = fixture.componentInstance;
    component.setNumber = 1;
    component.exerciseName = 'Bench Press';
    component.targetWeightKg = 80;
    component.targetReps = 8;
    fixture.detectChanges();
  });

  it('should create and pre-fill from target values', () => {
    expect(component).toBeTruthy();
    expect(component.weightKg()).toBe(80);
    expect(component.reps()).toBe(8);
    expect(component.state()).toBe('idle');
  });

  it('decrementWeight should reduce by 2.5kg, floor at 0', () => {
    component.weightKg.set(2.5);
    component.decrementWeight(new MouseEvent('click'));
    expect(component.weightKg()).toBe(0);

    component.decrementWeight(new MouseEvent('click'));
    expect(component.weightKg()).toBe(0); // clamped
  });

  it('incrementWeight should increase by 2.5kg', () => {
    component.weightKg.set(80);
    component.incrementWeight(new MouseEvent('click'));
    expect(component.weightKg()).toBeCloseTo(82.5);
  });

  it('decrementReps should not go below 1', () => {
    component.reps.set(1);
    component.decrementReps(new MouseEvent('click'));
    expect(component.reps()).toBe(1);
  });

  it('should emit completed with current values on markComplete', () => {
    const spy = jasmine.createSpy('completed');
    component.completed.subscribe(spy);
    component.markComplete(new MouseEvent('click'));
    expect(spy).toHaveBeenCalledWith({ weightKg: 80, reps: 8 });
    expect(component.state()).toBe('completed');
  });

  it('should not allow steppers after completion', () => {
    component.markComplete(new MouseEvent('click'));
    const before = component.weightKg();
    component.incrementWeight(new MouseEvent('click'));
    expect(component.weightKg()).toBe(before);
  });

  it('should show ghost text when lastSession is provided', () => {
    component.lastSession = { exerciseName: 'Bench Press', lastWeightKg: 75, lastReps: 10, lastDate: '2026-05-20' };
    fixture.detectChanges();
    expect(component.ghostText).toBe('last time: 75kg × 10');
  });

  it('should return null ghostText when no lastSession', () => {
    component.lastSession = null;
    expect(component.ghostText).toBeNull();
  });

  it('enterEditMode sets state to editing and populates edit signals', () => {
    component.enterEditMode();
    expect(component.state()).toBe('editing');
    expect(component.editWeight()).toBe('80.0');
    expect(component.editReps()).toBe('8');
  });

  it('commitEdit applies edit values and returns to idle', () => {
    component.enterEditMode();
    component.editWeight.set('90.0');
    component.editReps.set('6');
    component.commitEdit();
    expect(component.state()).toBe('idle');
    expect(component.weightKg()).toBe(90);
    expect(component.reps()).toBe(6);
  });

  it('long-press should trigger editMode after 400ms', fakeAsync(() => {
    const pointerDown = new PointerEvent('pointerdown', { clientX: 100, clientY: 100 });
    component.onPointerDown(pointerDown);
    tick(400);
    expect(component.state()).toBe('editing');
  }));

  it('moving > 8px should cancel long-press', fakeAsync(() => {
    const pointerDown = new PointerEvent('pointerdown', { clientX: 100, clientY: 100 });
    component.onPointerDown(pointerDown);
    tick(200); // before 400ms
    const pointerMove = new PointerEvent('pointermove', { clientX: 115, clientY: 100 }); // 15px movement
    component.onPointerMove(pointerMove);
    tick(400);
    expect(component.state()).toBe('idle'); // NOT editing
  }));
});
