import { Component, DestroyRef, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SocialFacade } from '../../../core/facade/social.facade';
import { Post } from '../../../core/models/social.model';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { CreateContentComponent } from '../components/create-content/create-content.component';
import { EditPostComponent } from '../components/edit-post/edit-post.component';
import { SocialFeedGuidedEmptyComponent } from './guided-empty/social-feed-guided-empty.component';
import { AuthenticationStore } from '../../../core/store/auth.store';

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
    PostCardComponent,
    SocialFeedGuidedEmptyComponent,
  ],
  templateUrl: './social-feed.component.html',
  styleUrl: './social-feed.component.css'
})
export class SocialFeedComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly facade = inject(SocialFacade);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly authStore = inject(AuthenticationStore);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('sentinel') sentinelRef!: ElementRef;
  private observer: IntersectionObserver | null = null;

  readonly skeletons = Array.from({ length: 3 });

  ngOnInit(): void {
    this.facade.loadFeed(true);
    // Fix 7: load current user's following count to decide whether to show guided empty state
    const myId = this.authStore.authUser()?.id;
    if (myId) {
      this.facade.loadMyFollowingCount(myId);
    }
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
    const isMobile = window.innerWidth <= 640;
    this.dialog.open(EditPostComponent, {
      data: { post },
      panelClass: 'edit-post-panel',
      maxWidth: isMobile ? '100vw' : '560px',
      width: '100%',
      position: isMobile ? { bottom: '0' } : undefined,
    });
  }

  openArticle(articleId: number): void {
    this.router.navigate(['/social/article', articleId]);
  }

  openCreatePost(): void {
    const isMobile = window.innerWidth <= 640;
    this.dialog.open(CreateContentComponent, {
      panelClass: 'create-post-panel',
      maxWidth: isMobile ? '100vw' : '600px',
      width: '100%',
      position: isMobile ? { bottom: '0' } : undefined,
    }).afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) this.facade.loadFeed(true);
    });
  }
}
