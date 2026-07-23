import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  const swPush = { isEnabled: true };
  let originalVapidKey: string;

  beforeEach(() => {
    originalVapidKey = environment.vapidPublicKey;
    environment.vapidPublicKey = 'test-public-key';
    TestBed.configureTestingModule({ providers: [{ provide: SwPush, useValue: swPush }] });
  });

  afterEach(() => {
    environment.vapidPublicKey = originalVapidKey;
    swPush.isEnabled = true;
  });

  it('reports unsupported when Angular push is disabled', () => {
    swPush.isEnabled = false;
    expect(TestBed.inject(PushNotificationService).availability).toBe('unsupported');
  });

  it('reports iOS non-installed when not running standalone', () => {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)');
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    expect(TestBed.inject(PushNotificationService).availability).toBe('ios-not-installed');
  });

  it('reports denied when browser permission was refused', () => {
    spyOnProperty(Notification, 'permission', 'get').and.returnValue('denied');
    expect(TestBed.inject(PushNotificationService).availability).toBe('denied');
  });
});
