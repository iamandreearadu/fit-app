export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DeletePushSubscriptionRequest {
  endpoint: string;
}

export type PushOptInState =
  | 'idle'
  | 'requesting'
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'ios-not-installed'
  | 'configuration-missing'
  | 'error';
