import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject, BehaviorSubject } from 'rxjs';
import { DirectMessage } from '../models/chat.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatHubService {
  private connection: HubConnection | null = null;

  private readonly messageSubject = new Subject<DirectMessage>();
  readonly message$ = this.messageSubject.asObservable();

  private readonly newConvMessageSubject = new Subject<DirectMessage>();
  readonly newConvMessage$ = this.newConvMessageSubject.asObservable();

  private readonly messageDeletedSubject = new Subject<{ messageId: number; conversationId: number }>();
  readonly messageDeleted$ = this.messageDeletedSubject.asObservable();

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
      .withUrl(`${environment.apiUrl}/hubs/chat`, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000, 120000])
      .build();

    this.connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'));
    this.connection.onreconnected(() => {
      this.connectionStateSubject.next('connected');
      this.reconnectedSubject.next();
    });
    this.connection.onclose(() => this.connectionStateSubject.next('disconnected'));

    this.connection.on('ReceiveMessage', (msg: DirectMessage) => this.messageSubject.next(msg));
    this.connection.on('NewConversationMessage', (msg: DirectMessage) => this.newConvMessageSubject.next(msg));
    this.connection.on('MessageDeleted', (payload: { messageId: number; conversationId: number }) => this.messageDeletedSubject.next(payload));

    await this.connection.start();
    this.connectionStateSubject.next('connected');
  }

  async joinConversation(id: number): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;
    await this.connection.invoke('JoinConversation', id);
  }

  async leaveConversation(id: number): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;
    await this.connection.invoke('LeaveConversation', id);
  }

  async sendMessage(conversationId: number, content?: string, imageBase64?: string, mimeType?: string): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;
    await this.connection.invoke('SendMessage', conversationId, content ?? null, imageBase64 ?? null, mimeType ?? null);
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.connectionStateSubject.next('disconnected');
  }
}
