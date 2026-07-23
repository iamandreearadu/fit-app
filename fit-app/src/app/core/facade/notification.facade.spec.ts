import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { NotificationService } from '../../api/notification.service';
import { PushSubscriptionRequest } from '../models/push-notification.model';
import { NotificationHubService } from '../services/notification-hub.service';
import { PushNotificationService } from '../services/push-notification.service';
import { NotificationFacade } from './notification.facade';

describe('NotificationFacade push opt-in', () => {
  const subscription: PushSubscriptionRequest = {
    endpoint: 'https://push.example/subscription',
    keys: { p256dh: 'p256dh', auth: 'auth' },
  };
  const push = {
    availability: null,
    requestSubscription: jasmine.createSpy('requestSubscription'),
    unsubscribe: jasmine.createSpy('unsubscribe'),
  };
  const api = {
    subscribeToPush: jasmine.createSpy('subscribeToPush'),
  };

  beforeEach(() => {
    localStorage.clear();
    push.availability = null;
    push.requestSubscription.calls.reset();
    api.subscribeToPush.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        NotificationFacade,
        { provide: PushNotificationService, useValue: push },
        { provide: NotificationService, useValue: api },
        { provide: NotificationHubService, useValue: { notification$: EMPTY, reconnected$: EMPTY } },
      ],
    });
  });

  it('shows the prompt only after the daily check-in trigger and persists dismissal', () => {
    const facade = TestBed.inject(NotificationFacade);
    expect(facade.pushPromptVisible()).toBeFalse();

    facade.offerPushAfterDailyCheckIn();
    expect(facade.pushPromptVisible()).toBeTrue();

    facade.dismissPushPrompt();
    facade.offerPushAfterDailyCheckIn();
    expect(facade.pushPromptVisible()).toBeFalse();
  });

  it('requests the browser subscription and sends it through the API facade boundary', async () => {
    push.requestSubscription.and.resolveTo(subscription);
    api.subscribeToPush.and.returnValue(of(void 0));
    const facade = TestBed.inject(NotificationFacade);

    await facade.enablePushNotifications();

    expect(push.requestSubscription).toHaveBeenCalled();
    expect(api.subscribeToPush).toHaveBeenCalledOnceWith(subscription);
    expect(facade.pushOptInState()).toBe('subscribed');
  });
});
