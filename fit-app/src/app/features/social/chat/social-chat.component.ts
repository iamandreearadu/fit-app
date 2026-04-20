import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChatFacade } from '../../../core/facade/chat.facade';

@Component({
  selector: 'app-social-chat',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './social-chat.component.html',
  styleUrl: './social-chat.component.css'
})
export class SocialChatComponent implements OnInit {
  protected readonly facade = inject(ChatFacade);
  protected readonly router = inject(Router);

  readonly skeletons = Array.from({ length: 5 });
  readonly activeConvId = signal<number | null>(null);

  ngOnInit(): void {
    this.facade.loadConversations();
  }

  openConversation(id: number): void {
    this.activeConvId.set(id);
    this.router.navigate(['/social/chat', id]);
  }

  formatUnreadBadge(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  getLastMessagePreview(conv: { lastMessage?: { content?: string; hasImage: boolean } }): string {
    if (!conv.lastMessage) return '';
    if (conv.lastMessage.hasImage) return 'Image';
    return conv.lastMessage.content ?? '';
  }
}
