import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProgressService } from '../../api/progress.service';
import { ProgressSummaryDto } from '../models/progress.model';
import { ProgressFacade } from './progress.facade';

describe('ProgressFacade', () => {
  let facade: ProgressFacade;
  let api: jasmine.SpyObj<ProgressService>;
  const summary: ProgressSummaryDto = {
    trends: { window: 7, dates: [], weightKg: [], energyLevel: [], caloriesIn: [], caloriesBurned: [], tdee: 2000, proteinG: [], carbsG: [], fatG: [], waterL: [], waterTargetL: 2, steps: [], stepTarget: [] },
    streak: { completeDayStreak: 2, loggedTodayComplete: false, missingToday: ['water'], daysUntilUnlock: 5 },
    weeklyReport: null,
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ProgressService>('ProgressService', ['getSummary', 'refreshReport', 'logCheckIn']);
    TestBed.configureTestingModule({ providers: [ProgressFacade, { provide: ProgressService, useValue: api }] });
    facade = TestBed.inject(ProgressFacade);
  });

  it('loads summary and changes the selected window', async () => {
    api.getSummary.and.returnValue(of(summary));
    await facade.loadSummary();
    expect(facade.summary()).toEqual(summary);
    await facade.setWindow(30);
    expect(api.getSummary).toHaveBeenCalledWith(30);
    expect(facade.window()).toBe(30);
  });

  it('publishes an error when summary loading fails', async () => {
    api.getSummary.and.returnValue(throwError(() => new Error('offline')));
    await facade.loadSummary();
    expect(facade.loading()).toBeFalse();
    expect(facade.error()).toContain('could not be loaded');
  });

  it('sends only the dedicated check-in payload and refreshes progress', async () => {
    api.logCheckIn.and.returnValue(of({ date: '2026-07-23', manualWeight: 65.5, energyLevel: 4 }));
    api.getSummary.and.returnValue(of(summary));
    expect(await facade.logTodayWeight(65.5, 4)).toBeTrue();
    expect(api.logCheckIn).toHaveBeenCalledWith(jasmine.objectContaining({ manualWeight: 65.5, energyLevel: 4 }));
    expect(api.getSummary).toHaveBeenCalledWith(7);
  });

  it('does not call the API for an invalid weight', async () => {
    expect(await facade.logTodayWeight(10, 3)).toBeFalse();
    expect(api.logCheckIn).not.toHaveBeenCalled();
  });
});
