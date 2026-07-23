import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompleteStreakStatusDto } from '../../../../core/models/progress.model';
import { CompleteStreakHeroComponent } from './complete-streak-hero.component';

describe('CompleteStreakHeroComponent', () => {
  let fixture: ComponentFixture<CompleteStreakHeroComponent>;
  let component: CompleteStreakHeroComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompleteStreakHeroComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CompleteStreakHeroComponent);
    component = fixture.componentInstance;
  });

  function render(streak: number): HTMLElement {
    const status: CompleteStreakStatusDto = {
      completeDayStreak: streak,
      loggedTodayComplete: false,
      missingToday: ['meals', 'activity', 'steps', 'water'],
      daysUntilUnlock: Math.max(0, 7 - streak),
    };
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('maps the streak value to the ring custom property', () => {
    const element = render(3);

    expect(element.querySelector<HTMLElement>('.ring')?.style.getPropertyValue('--streak')).toBe('3');
  });

  it('caps an unlocked streak ring at seven', () => {
    const element = render(11);

    expect(element.querySelector<HTMLElement>('.ring')?.style.getPropertyValue('--streak')).toBe('7');
  });
});
