import { Component, input, output, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Post } from '../../../../core/models/social.model';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, DatePipe],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent {
  private readonly router = inject(Router);

  post = input.required<Post>();
  likeToggled = output<number>();
  commentClicked = output<number>();
  followToggled = output<string>();
  deleteClicked = output<number>();
  editClicked = output<Post>();

  showFullContent = signal(false);
  showFullArticle = signal(false);
  imageError = signal(false);
  showMenu = signal(false);

  readonly isArticle = computed(() => !!this.post().articleId);

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showMenu.set(false);
  }

  readonly isContentLong = computed(() => this.post().content.length > 200);

  readonly displayContent = computed(() => {
    if (this.showFullContent() || !this.isContentLong()) return this.post().content;
    return this.post().content.slice(0, 200) + '...';
  });

  onLike(): void {
    this.likeToggled.emit(this.post().id);
  }

  onComment(): void {
    this.commentClicked.emit(this.post().id);
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
