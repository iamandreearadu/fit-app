import {
  Component, inject, OnInit, OnDestroy, signal, ElementRef, ViewChild, computed, effect
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { TextFieldModule } from '@angular/cdk/text-field';
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
export class SocialChatDetailComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(ChatFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('msgArea') msgAreaRef!: ElementRef<HTMLElement>;

  conversationId = 0;
  messageInput = signal('');
  imagePreview = signal<string | null>(null);
  imageBase64 = signal<string | null>(null);
  imageMimeType = signal<string | null>(null);
  attachmentError = signal<string | null>(null);
  isSending = signal(false);
  lightboxSrc = signal<string | null>(null);
  revealedTimestampId = signal<number | null>(null);
  private touchStartX = 0;

  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    // Scroll to bottom after every messages update — setTimeout pushes past current render cycle
    effect(() => {
      const msgs = this.facade.messages();
      if (msgs.length > 0) {
        setTimeout(() => {
          const el = this.msgAreaRef?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        }, 0);
      }
    });
  }

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

  ngOnDestroy(): void {
    this.facade.leaveConversation(this.conversationId);
  }

  async sendMessage(): Promise<void> {
    const text = this.messageInput().trim();
    const img = this.imageBase64();
    if ((!text && !img) || this.isSending()) return;

    this.isSending.set(true);
    this.attachmentError.set(null);
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
      this.attachmentError.set('Image could not be sent. Please try again.');
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
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.attachmentError.set(null);
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedTypes.has(file.type)) {
      this.attachmentError.set('Choose a JPEG, PNG, WebP or GIF image.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.attachmentError.set('Image must be smaller than 5 MB.');
      input.value = '';
      return;
    }

    this.imageMimeType.set(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      this.imagePreview.set(result);
      this.imageBase64.set(result.split(',')[1]);
    };
    reader.onerror = () => this.attachmentError.set('Image could not be read. Please choose it again.');
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.imageBase64.set(null);
    this.imageMimeType.set(null);
    this.attachmentError.set(null);
  }

  async deleteMessage(msgId: number): Promise<void> {
    await this.facade.deleteMessage(this.conversationId, msgId);
  }

  openLightbox(src: string): void { this.lightboxSrc.set(src); }
  closeLightbox(): void { this.lightboxSrc.set(null); }
  goBack(): void { this.router.navigate(['/social/chat']); }

  openParticipantProfile(): void {
    const participant = this.otherParticipant();
    if (!participant) return;
    void this.router.navigate(['/social/profile', participant.id], {
      state: { returnUrl: this.router.url }
    });
  }

  openSharedPost(postId: number): void {
    void this.router.navigate(['/social/post', postId], { state: { returnUrl: this.router.url } });
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

  isHourGap(current: DirectMessage, previous: DirectMessage): boolean {
    return new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime() >= 60 * 60 * 1000;
  }

  formatTimelineLabel(value: string): string {
    const date = new Date(value);
    return `${this.formatDateLabel(date.toDateString())} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  onMessageTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0]?.clientX ?? 0;
  }

  onMessageTouchEnd(event: TouchEvent, messageId: number): void {
    const endX = event.changedTouches[0]?.clientX ?? this.touchStartX;
    const delta = endX - this.touchStartX;
    if (delta < -28) this.revealedTimestampId.set(messageId);
    else if (delta > 20 || Math.abs(delta) < 8) this.revealedTimestampId.set(null);
  }
}
