import {
  Component, inject, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewChecked, computed
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { ChatFacade } from '../../../core/facade/chat.facade';
import { DirectMessage } from '../../../core/models/chat.model';

interface MessageGroup {
  dateLabel: string;
  messages: DirectMessage[];
}

@Component({
  selector: 'app-social-chat-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    TextFieldModule
  ],
  templateUrl: './social-chat-detail.component.html',
  styleUrl: './social-chat-detail.component.css'
})
export class SocialChatDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  protected readonly facade = inject(ChatFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('msgArea') msgAreaRef!: ElementRef;

  conversationId = 0;
  messageInput = signal('');
  imagePreview = signal<string | null>(null);
  imageBase64 = signal<string | null>(null);
  imageMimeType = signal<string | null>(null);
  isSending = signal(false);
  lightboxSrc = signal<string | null>(null);

  readonly skeletons = Array.from({ length: 6 });
  private shouldScrollToBottom = true;

  readonly otherParticipant = computed(() => {
    const conv = this.facade.conversations().find(c => c.id === this.conversationId);
    return conv?.otherParticipant ?? null;
  });

  readonly messageGroups = computed((): MessageGroup[] => {
    const groups: MessageGroup[] = [];
    let currentDate = '';
    let currentGroup: MessageGroup | null = null;

    for (const msg of this.facade.messages()) {
      const dateLabel = new Date(msg.sentAt).toDateString();
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        currentGroup = { dateLabel, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup!.messages.push(msg);
    }
    return groups;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.conversationId = idParam ? parseInt(idParam, 10) : 0;

    this.facade.loadMessages(this.conversationId);
    this.facade.joinConversation(this.conversationId);
    this.facade.markAsRead(this.conversationId);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.facade.leaveConversation(this.conversationId);
  }

  private scrollToBottom(): void {
    const el = this.msgAreaRef?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.messageInput().trim();
    const img = this.imageBase64();
    if ((!text && !img) || this.isSending()) return;

    this.isSending.set(true);
    this.shouldScrollToBottom = true;
    try {
      await this.facade.sendMessage(
        this.conversationId,
        text || undefined,
        img || undefined,
        this.imageMimeType() || undefined
      );
      this.messageInput.set('');
      this.imagePreview.set(null);
      this.imageBase64.set(null);
      this.imageMimeType.set(null);
    } catch {
      // silently ignore
    } finally {
      this.isSending.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageMimeType.set(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      this.imagePreview.set(result);
      this.imageBase64.set(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.imageBase64.set(null);
    this.imageMimeType.set(null);
  }

  async deleteMessage(msgId: number): Promise<void> {
    await this.facade.deleteMessage(this.conversationId, msgId);
  }

  openLightbox(src: string): void {
    this.lightboxSrc.set(src);
  }

  closeLightbox(): void {
    this.lightboxSrc.set(null);
  }

  goBack(): void {
    this.router.navigate(['/social/chat']);
  }

  formatDateLabel(label: string): string {
    const d = new Date(label);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
