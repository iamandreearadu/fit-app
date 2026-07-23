import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Post } from '../../../../core/models/social.model';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import { AlertService } from '../../../../shared/services/alert.service';
import { MatDialog } from '@angular/material/dialog';
import { SocialService } from '../../../../api/social.service';
import { PostShareDialogComponent } from '../post-share-dialog/post-share-dialog.component';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, DatePipe, ClickOutsideDirective],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent {
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  private readonly social = inject(SocialService);
  private lastImageTapAt = 0;

  post = input.required<Post>();
  showArchiveAction = input(false);
  likeToggled = output<number>();
  commentClicked = output<number>();
  followToggled = output<string>();
  deleteClicked = output<number>();
  editClicked = output<Post>();
  archiveClicked = output<number>();
  savedToggled = output<{ postId: number; isSaved: boolean }>();

  showFullContent = signal(false);
  showFullArticle = signal(false);
  imageError = signal(false);
  showMenu = signal(false);
  savePending = signal(false);
  savedOverride = signal<boolean | null>(null);
  readonly isSaved = computed(() => this.savedOverride() ?? this.post().isSavedByMe ?? false);

  readonly isArticle   = computed(() => !!this.post().articleId);

  // Fix 9 — seed content computed signals
  readonly isSeed      = computed(() => !!this.post().isSeedContent);
  readonly isTip       = computed(() => this.isSeed() && !this.post().articleId);
  readonly isEdArticle = computed(() => this.isSeed() && !!this.post().articleId);

  readonly isContentLong = computed(() => this.post().content.length > 200);

  readonly displayContent = computed(() => {
    if (this.showFullContent() || !this.isContentLong()) return this.post().content;
    return this.post().content.slice(0, 200) + '...';
  });

  readonly articleBodyText = computed(() => {
    const p = this.post();
    // When title exists, don't fall back to `content` — backend sets content = title
    // when there's no caption/description, which would cause a visual duplicate.
    return p.articleDescription || p.articleCaption || (p.articleTitle ? '' : p.content) || '';
  });

  readonly isArticleBodyLong = computed(() => this.articleBodyText().length > 180);

  onLike(): void {
    this.likeToggled.emit(this.post().id);
  }

  onComment(): void {
    this.commentClicked.emit(this.post().id);
  }

  onImageTap(): void {
    const now = Date.now();
    if (now - this.lastImageTapAt <= 320 && !this.post().isLikedByMe) {
      this.onLike();
      this.lastImageTapAt = 0;
      return;
    }
    this.lastImageTapAt = now;
  }

  onShare(): void {
    const p = this.post();
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    this.dialog.open(PostShareDialogComponent, {
      data: { postId: p.id, authorName: p.author.displayName, content: p.content },
      autoFocus: '.search-input',
      restoreFocus: true,
      panelClass: 'post-share-dialog-panel',
      width: isMobile ? 'calc(100vw - 16px)' : '460px',
      maxWidth: isMobile ? 'calc(100vw - 16px)' : '460px',
      maxHeight: isMobile
        ? 'calc(100dvh - var(--nav-height) - env(safe-area-inset-bottom, 0px) - 42px)'
        : 'calc(100dvh - 64px)',
      position: isMobile
        ? { bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 26px)' }
        : undefined,
    });
  }

  onSave(): void {
    if (this.savePending()) return;
    const previous = this.isSaved();
    this.savedOverride.set(!previous);
    this.savePending.set(true);
    this.social.toggleSave(this.post().id).subscribe({
      next: result => { this.savedOverride.set(result.isSaved); this.savePending.set(false); this.savedToggled.emit({ postId: this.post().id, isSaved: result.isSaved }); },
      error: () => { this.savedOverride.set(previous); this.savePending.set(false); this.alerts.error('Could not update saved posts. Please try again.'); }
    });
  }

  onFollow(): void {
    this.followToggled.emit(this.post().author.id);
  }

  toggleMenu(e: Event): void {
    e.stopPropagation();
    this.showMenu.update(v => !v);
  }

  onEdit(e: Event): void {
    e.stopPropagation();
    this.showMenu.set(false);
    this.editClicked.emit(this.post());
  }

  onDelete(e: Event): void {
    e.stopPropagation();
    this.showMenu.set(false);
    this.deleteClicked.emit(this.post().id);
  }

  onArchive(e: Event): void {
    e.stopPropagation();
    this.showMenu.set(false);
    this.archiveClicked.emit(this.post().id);
  }

  toggleShowMore(): void {
    this.showFullContent.update(v => !v);
  }

  toggleArticle(e: Event): void {
    e.stopPropagation();
    this.showFullArticle.update(v => !v);
  }

  openArticle(): void {
    this.router.navigate(['/social/article', this.post().articleId], {
      state: { returnUrl: this.router.url }
    });
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  getBadgeClass(type: string): string {
    switch (type) {
      case 'workout': return 'badge-primary';
      case 'meal': return 'badge-success';
      case 'daily': return 'badge-info';
      default: return 'badge-primary';
    }
  }
}
