import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressTrendsDto } from '../../../../core/models/progress.model';
import { ProgressWeightCardComponent } from './progress-weight-card.component';

describe('ProgressWeightCardComponent', () => {
  let fixture: ComponentFixture<ProgressWeightCardComponent>;
  let component: ProgressWeightCardComponent;
  const today = new Date().toISOString().slice(0, 10);
  const trends: ProgressTrendsDto = {
    window: 7,
    dates: [today],
    weightKg: [70],
    energyLevel: [4],
    caloriesIn: [1800],
    caloriesBurned: [300],
    tdee: 2200,
    proteinG: [130],
    carbsG: [180],
    fatG: [60],
    waterL: [2],
    waterTargetL: 2.2,
    steps: [8000],
    stepTarget: [9000],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressWeightCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ProgressWeightCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('trends', trends);
    fixture.detectChanges();
  });

  it('emits a valid weight and energy check-in', () => {
    const emitted: Array<{ weight: number; energyLevel?: number }> = [];
    component.saveCheckIn.subscribe(value => emitted.push(value));
    component.weight = 71.2;
    component.energyLevel = 4;

    component.submit();

    expect(emitted).toEqual([{ weight: 71.2, energyLevel: 4 }]);
  });

  it('hydrates today weight and energy from persisted trends', () => {
    expect(component.weight).toBe(70);
    expect(component.energyLevel).toBe(4);
  });

  it('does not overwrite an in-progress edit when trends refresh', () => {
    component.weight = 71.3;
    component.markCheckInEdited();

    fixture.componentRef.setInput('trends', {
      ...trends,
      weightKg: [69.8],
    });
    fixture.detectChanges();

    expect(component.weight).toBe(71.3);
  });

  it('does not emit an invalid weight', () => {
    spyOn(component.saveCheckIn, 'emit');
    component.weight = 20;

    component.submit();

    expect(component.saveCheckIn.emit).not.toHaveBeenCalled();
  });

  it('announces a successful check-in', () => {
    fixture.componentRef.setInput('saved', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.check-in-status')?.textContent)
      .toContain('was saved');
  });
});
