import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConversationService } from '../../../../api/conversation.service';
import { SocialService } from '../../../../api/social.service';
import { ConversationSummary } from '../../../../core/models/chat.model';
import { UserSearchResult } from '../../../../core/models/social.model';

export interface PostShareDialogData { postId: number; authorName: string; content: string; }

@Component({
  selector: 'app-post-share-dialog', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './post-share-dialog.component.html',
  styleUrl: './post-share-dialog.component.css'
})
export class PostShareDialogComponent {
  readonly data = inject<PostShareDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PostShareDialogComponent>);
  private readonly conversations = inject(ConversationService);
  private readonly social = inject(SocialService);
  readonly search = new FormControl('', { nonNullable: true });
  readonly recent = signal<UserSearchResult[]>([]);
  readonly results = signal<UserSearchResult[]>([]);
  readonly searching = signal(false);
  readonly searchError = signal(false);
  readonly sending = signal(new Set<string>());
  readonly sent = signal(new Set<string>());
  readonly copied = signal(false);
  readonly status = signal('');
  readonly canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  constructor() {
    this.conversations.getConversations().pipe(takeUntilDestroyed()).subscribe({
      next: items => this.recent.set(this.toUsers(items)), error: () => this.recent.set([])
    });
    this.search.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(),
      filter(q => { if (q.trim().length < 2) { this.results.set([]); this.searching.set(false); return false; } return true; }),
      switchMap(q => { this.searching.set(true); this.searchError.set(false); return this.social.searchUsers(q.trim()); }),
      takeUntilDestroyed()
    ).subscribe({ next: users => { this.results.set(users); this.searching.set(false); }, error: () => { this.searchError.set(true); this.searching.set(false); } });
  }

  private toUsers(items: ConversationSummary[]): UserSearchResult[] {
    const seen = new Set<string>();
    return items.map(x => x.otherParticipant).filter(x => !seen.has(x.id) && !!seen.add(x.id)).map(x => ({ ...x, isFollowedByMe: false }));
  }

  users(): UserSearchResult[] { return this.search.value.trim().length >= 2 ? this.results() : this.recent(); }
  close(): void { this.ref.close(); }
  send(user: UserSearchResult): void {
    if (this.sending().has(user.id) || this.sent().has(user.id)) return;
    this.sending.update(s => new Set(s).add(user.id));
    this.social.sharePost({ targetUserId: user.id, postId: this.data.postId }).subscribe({
      next: () => { this.sending.update(s => { const n = new Set(s); n.delete(user.id); return n; }); this.sent.update(s => new Set(s).add(user.id)); this.status.set(`Post sent to ${user.displayName}`); },
      error: () => { this.sending.update(s => { const n = new Set(s); n.delete(user.id); return n; }); this.status.set(`Could not send to ${user.displayName}. Try again.`); }
    });
  }
  async shareVia(): Promise<void> {
    if (!navigator.share) return this.copyLink();
    try { await navigator.share({ title: `Post by ${this.data.authorName}`, text: this.data.content.slice(0, 120), url: this.url }); } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) this.status.set('Could not open sharing.'); }
  }
  async copyLink(): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(this.url);
      else this.copyWithSelection(this.url);
      this.copied.set(true);
      this.status.set('Link copied');
      window.setTimeout(() => this.copied.set(false), 2000);
    } catch { this.status.set('Could not copy the link.'); }
  }
  private copyWithSelection(value: string): void {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Copy unavailable');
  }
  private get url(): string { return `${window.location.origin}/social/post/${this.data.postId}`; }
}
