import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { DirectMessage } from '../models/chat.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatHubService {
  private connection: HubConnection | null = null;

  private readonly messageSubject = new Subject<DirectMessage>();
  readonly message$ = this.messageSubject.asObservable();

  async connect(token: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/chat`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveMessage', (msg: DirectMessage) => this.messageSubject.next(msg));

    await this.connection.start();
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
  }
}
