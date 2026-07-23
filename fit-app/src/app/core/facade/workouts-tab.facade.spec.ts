import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { WorkoutsTabService } from '../../api/workouts-tab.service';
import { NotificationHubService } from '../services/notification-hub.service';
import { WorkoutCompletionSummary, WorkoutTemplate } from '../models/workouts-tab.model';
import { WorkoutsTabFacade } from './workouts-tab.facade';

describe('WorkoutsTabFacade', () => {
  let facade: WorkoutsTabFacade;
  let service: jasmine.SpyObj<WorkoutsTabService>;
  const completed = new Subject<WorkoutCompletionSummary>();

  beforeEach(() => {
    service = jasmine.createSpyObj<WorkoutsTabService>('WorkoutsTabService', [
      'listTemplates', 'getTemplate', 'addTemplate', 'updateTemplateByUid',
      'deleteTemplateByUid', 'getLastSession', 'completeSession',
    ]);
    TestBed.configureTestingModule({
      providers: [
        WorkoutsTabFacade,
        { provide: WorkoutsTabService, useValue: service },
        { provide: NotificationHubService, useValue: { workoutCompleted$: completed.asObservable() } },
      ],
    });
    facade = TestBed.inject(WorkoutsTabFacade);
  });

  it('loads templates and clears the loading state', async () => {
    const templates: WorkoutTemplate[] = [{
      id: 1, uid: '1', title: 'Push', type: 'Strength', durationMin: 45,
      caloriesEstimateKcal: 300, isSystemTemplate: false,
    }];
    service.listTemplates.and.resolveTo(templates);

    await facade.loadTemplates();

    expect(facade.templatesSignal()).toEqual(templates);
    expect(facade.loadingSignal()).toBeFalse();
  });

  it('exposes an error instead of presenting a failed request as an empty list', async () => {
    service.listTemplates.and.rejectWith(new Error('network'));

    await facade.loadTemplates();

    expect(facade.error()).toBe('Failed to load workouts. Please try again.');
    expect(facade.loadingSignal()).toBeFalse();
  });

  it('reports a save failure returned by the API service', async () => {
    service.addTemplate.and.resolveTo(null);

    await facade.createOrUpdateTemplate({ title: 'Push' });

    expect(facade.error()).toBe('Failed to save workout. Please try again.');
  });
});
