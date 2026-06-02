import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
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

  async connect(token: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveNotification', (n: SocialNotification) => this.notifSubject.next(n));
    this.connection.on('streak-updated', (p: StreakUpdatedPayload) => this.streakSubject.next(p));
    this.connection.on('workout-completed', (s: WorkoutCompletionSummary) =>
      this.workoutCompletedSubject.next(s));

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
  }
}
