import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SocialFacade } from '../../../core/facade/social.facade';
import { Post } from '../../../core/models/social.model';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { CreatePostComponent } from '../components/create-post/create-post.component';
import { EditPostComponent } from '../components/edit-post/edit-post.component';

@Component({
  selector: 'app-social-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PostCardComponent
  ],
  templateUrl: './social-feed.component.html',
  styleUrl: './social-feed.component.css'
})
export class SocialFeedComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly facade = inject(SocialFacade);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  @ViewChild('sentinel') sentinelRef!: ElementRef;
  private observer: IntersectionObserver | null = null;

  readonly skeletons = Array.from({ length: 3 });

  ngOnInit(): void {
    this.facade.loadFeed(true);
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.facade.isLoadingFeed()) {
          this.facade.loadFeed();
        }
      },
      { rootMargin: '200px' }
    );
    if (this.sentinelRef?.nativeElement) {
      this.observer.observe(this.sentinelRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  onLikeToggled(postId: number): void {
    this.facade.toggleLike(postId);
  }

  onCommentClicked(postId: number): void {
    this.router.navigate(['/social/post', postId]);
  }

  onFollowToggled(userId: string): void {
    this.facade.toggleFollow(userId);
  }

  onDeleteClicked(postId: number): void {
    this.facade.deletePost(postId);
  }

  onEditClicked(post: Post): void {
    this.dialog.open(EditPostComponent, {
      data: { post },
      panelClass: 'create-post-panel',
      maxWidth: '560px',
      width: '100%'
    });
  }

  openArticle(articleId: number): void {
    this.router.navigate(['/social/article', articleId]);
  }

  openCreatePost(): void {
    this.dialog.open(CreatePostComponent, {
      panelClass: 'create-post-panel',
      maxWidth: '560px',
      width: '100%'
    });
  }
}
