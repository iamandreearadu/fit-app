import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject, BehaviorSubject } from 'rxjs';
import { SocialNotification, StreakUpdatedPayload } from '../models/notification.model';
import { WorkoutCompletionSummary } from '../models/workouts-tab.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private connection: HubConnection | null = null;

  private readonly notifSubject = new Subject<SocialNotification>();
  readonly notification$ = this.notifSubject.asObservable();

  // Fix 5 — streak-updated event (distinct from ReceiveNotification)
  private readonly streakSubject = new Subject<StreakUpdatedPayload>();
  readonly streakUpdated$ = this.streakSubject.asObservable();

  // Fix 3 — workout-completed event pushed after POST /api/workouts/sessions
  private readonly workoutCompletedSubject = new Subject<WorkoutCompletionSummary>();
  readonly workoutCompleted$ = this.workoutCompletedSubject.asObservable();

  private readonly reconnectedSubject = new Subject<void>();
  private readonly connectionStateSubject = new BehaviorSubject<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  readonly reconnected$ = this.reconnectedSubject.asObservable();
  readonly connectionState$ = this.connectionStateSubject.asObservable();

  async connect(token: string): Promise<void> {
    const s = this.connection?.state;
    if (s === HubConnectionState.Connected ||
        s === HubConnectionState.Connecting ||
        s === HubConnectionState.Reconnecting) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000, 120000])
      .build();

    this.connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'));
    this.connection.onreconnected(() => {
      this.connectionStateSubject.next('connected');
      this.reconnectedSubject.next();
    });
    this.connection.onclose(() => this.connectionStateSubject.next('disconnected'));

    this.connection.on('ReceiveNotification', (n: SocialNotification) => this.notifSubject.next(n));
    this.connection.on('streak-updated', (p: StreakUpdatedPayload) => this.streakSubject.next(p));
    this.connection.on('workout-completed', (s: WorkoutCompletionSummary) =>
      this.workoutCompletedSubject.next(s));

    await this.connection.start();
    this.connectionStateSubject.next('connected');
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.connectionStateSubject.next('disconnected');
  }
}
