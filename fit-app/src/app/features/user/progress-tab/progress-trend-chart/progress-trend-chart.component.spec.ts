import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressTrendsDto } from '../../../../core/models/progress.model';
import { ProgressTrendChartComponent } from './progress-trend-chart.component';

describe('ProgressTrendChartComponent', () => {
  let fixture: ComponentFixture<ProgressTrendChartComponent>;
  let component: ProgressTrendChartComponent;
  const trends: ProgressTrendsDto = {
    window: 7, dates: ['2026-07-23'], weightKg: [65], energyLevel: [4],
    caloriesIn: [1800], caloriesBurned: [300], tdee: 2100,
    proteinG: [120], carbsG: [180], fatG: [60], waterL: [2.1], waterTargetL: 2.2,
    steps: [8000], stepTarget: [10000],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgressTrendChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgressTrendChartComponent);
    component = fixture.componentInstance;
    component.kind = 'calories';
    component.trends = trends;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('builds consumed, burned and TDEE datasets for calories', () => {
    expect(component.chart.data.datasets.map(dataset => dataset.label)).toEqual(['Consumed', 'Burned', 'TDEE']);
    expect(component.empty).toBeFalse();
  });

  it('shows the empty state when a trend has no logged values', () => {
    component.kind = 'hydration';
    component.trends = { ...trends, waterL: [0] };
    component.ngOnChanges();
    fixture.detectChanges();
    expect(component.empty).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Log a few days');
  });
});
