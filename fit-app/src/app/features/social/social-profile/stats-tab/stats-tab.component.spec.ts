import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SocialProfileFacade } from '../../../../core/facade/social-profile.facade';
import { UserPublicStats } from '../../../../core/models/stats.model';
import { StatsTabComponent } from './stats-tab.component';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

describe('StatsTabComponent', () => {
  let fixture: ComponentFixture<StatsTabComponent>;
  let component: StatsTabComponent;
  let facade: {
    publicStats: ReturnType<typeof signal<UserPublicStats | null>>;
    publicStatsError: ReturnType<typeof signal<string | null>>;
    loadPublicStats: jasmine.Spy<(userId: string) => Promise<void>>;
  };

  const stats = (activeStreak: number): UserPublicStats => ({
    activeStreak,
    workoutsThisMonth: 4,
    volumeThisMonth: 1250,
    weeklyVolumes: [
      { weekStart: '2026-07-06', volumeKg: 500 },
      { weekStart: '2026-07-13', volumeKg: 750 }
    ],
    recentWorkouts: [{ id: 1, name: 'Push day', date: '2026-07-20', volumeKg: 750 }]
  });

  beforeEach(async () => {
    facade = {
      publicStats: signal<UserPublicStats | null>(null),
      publicStatsError: signal<string | null>(null),
      loadPublicStats: jasmine.createSpy('loadPublicStats').and.resolveTo()
    };

    await TestBed.configureTestingModule({
      imports: [StatsTabComponent, NoopAnimationsModule],
      providers: [{ provide: SocialProfileFacade, useValue: facade }]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsTabComponent);
    component = fixture.componentInstance;
  });

  it('reloads and clears the previous stats when userId changes', async () => {
    facade.publicStats.set(stats(3));
    fixture.componentRef.setInput('userId', 'user-a');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.stats()?.activeStreak).toBe(3);

    const pending = deferred();
    facade.loadPublicStats.and.returnValue(pending.promise);
    fixture.componentRef.setInput('userId', 'user-b');
    fixture.detectChanges();

    expect(component.stats()).toBeNull();
    expect(component.loading()).toBeTrue();
    expect(facade.loadPublicStats).toHaveBeenCalledWith('user-b');
  });

  it('ignores a stale response from the previous user', async () => {
    const first = deferred();
    const second = deferred();
    facade.loadPublicStats.and.returnValues(first.promise, second.promise);

    fixture.componentRef.setInput('userId', 'user-a');
    fixture.detectChanges();
    fixture.componentRef.setInput('userId', 'user-b');
    fixture.detectChanges();

    facade.publicStats.set(stats(8));
    second.resolve();
    await fixture.whenStable();
    expect(component.stats()?.activeStreak).toBe(8);

    facade.publicStats.set(stats(99));
    first.resolve();
    await fixture.whenStable();
    expect(component.stats()?.activeStreak).toBe(8);
  });

  it('shows the current request error and retry action', async () => {
    facade.loadPublicStats.and.callFake(async () => {
      facade.publicStatsError.set('Could not load stats. Please try again.');
    });
    fixture.componentRef.setInput('userId', 'user-a');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Could not load stats');
    alert.querySelector('button').click();
    expect(facade.loadPublicStats).toHaveBeenCalledTimes(2);
  });

  it('keeps private metrics hidden for visitors', async () => {
    facade.loadPublicStats.and.callFake(async () => facade.publicStats.set(stats(5)));
    fixture.componentRef.setInput('userId', 'user-a');
    fixture.componentRef.setInput('isOwnProfile', false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Weight and calorie data is private');
    expect(fixture.nativeElement.textContent).not.toContain('Avg Calories');
    expect(fixture.nativeElement.textContent).not.toContain('Weight Change');
  });

  it('exposes a textual summary for the volume chart', async () => {
    facade.loadPublicStats.and.callFake(async () => facade.publicStats.set(stats(5)));
    fixture.componentRef.setInput('userId', 'user-a');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stats-chart-summary').textContent)
      .toContain('Weekly volume increased');
  });

  function deferred(): Deferred {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
  }
});
