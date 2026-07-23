import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { PushSubscriptionRequest, PushOptInState } from '../models/push-notification.model';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);

  get availability(): PushOptInState | null {
    if (!this.swPush.isEnabled || !('Notification' in window)) return 'unsupported';
    if (!environment.vapidPublicKey) return 'configuration-missing';
    if (this.isIos() && !this.isStandalone()) return 'ios-not-installed';
    if (Notification.permission === 'denied') return 'denied';
    return null;
  }

  async requestSubscription(): Promise<PushSubscriptionRequest> {
    const subscription = await this.swPush.requestSubscription({
      serverPublicKey: environment.vapidPublicKey,
    });
    const json = subscription.toJSON();
    const p256dh = json.keys?.['p256dh'];
    const auth = json.keys?.['auth'];
    if (!json.endpoint || !p256dh || !auth) throw new Error('Invalid push subscription');
    return { endpoint: json.endpoint, keys: { p256dh, auth } };
  }

  async unsubscribe(): Promise<string | null> {
    const subscription = await firstValueFrom(this.swPush.subscription.pipe(take(1)));
    if (!subscription) return null;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return endpoint;
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  private isStandalone(): boolean {
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
  }
}
