import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { SocialNotification } from '../models/notification.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private connection: HubConnection | null = null;

  private readonly notifSubject = new Subject<SocialNotification>();
  readonly notification$ = this.notifSubject.asObservable();

  async connect(token: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveNotification', (n: SocialNotification) => this.notifSubject.next(n));

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
  }
}
