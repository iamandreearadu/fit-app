import { Component, DestroyRef, HostListener, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
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

  @ViewChild('feedContainer') feedContainer!: ElementRef<HTMLElement>;
  private observer: IntersectionObserver | null = null;

  // Use a setter-based ViewChild so we re-observe whenever the sentinel
  // enters the DOM (it lives inside a conditional @if block).
  @ViewChild('sentinel') set sentinelElement(ref: ElementRef | undefined) {
    if (ref?.nativeElement && this.observer) {
      this.observer.observe(ref.nativeElement);
    }
  }

  // Pull-to-refresh state
  private startY = 0;
  private isPulling = false;
  readonly isPullRefreshing = signal(false);

  // ── Scroll-to-hide top bar (Feed only) ────────────────────────────────────
  // Adds/removes `.topbar--scrolled-down` on <html> so the global top bar
  // can slide out via CSS transform. Class is cleaned up in ngOnDestroy.
  private lastScrollY = 0;
  private scrollRafId: number | null = null;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    // requestAnimationFrame throttle — prevents layout thrashing
    if (this.scrollRafId !== null) return;
    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;
      const scrollY = window.scrollY;
      const delta = scrollY - this.lastScrollY;
      this.lastScrollY = scrollY;

      if (scrollY > 80 && delta > 0) {
        document.documentElement.classList.add('topbar--scrolled-down');
      } else {
        document.documentElement.classList.remove('topbar--scrolled-down');
      }
    });
  }

  readonly skeletons = Array.from({ length: 3 });

  onPointerDown(e: PointerEvent): void {
    if (this.feedContainer?.nativeElement.scrollTop === 0) {
      this.startY = e.clientY;
      this.isPulling = true;
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isPulling) return;
    if (e.clientY - this.startY > 70) {
      this.isPullRefreshing.set(true);
    }
  }

  onPointerUp(): void {
    if (this.isPullRefreshing()) {
      this.facade.loadFeed(true);
    }
    this.isPulling = false;
    this.isPullRefreshing.set(false);
  }

  ngOnInit(): void {
    this.facade.loadFeed(true);
    // Fix 7: load current user's following count to decide whether to show guided empty state
    const myId = this.authStore.authUser()?.id;
    if (myId) {
      this.facade.loadMyFollowingCount();
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
    // Sentinel attachment is handled by the @ViewChild setter above.
    // It fires whenever the sentinel element enters the DOM (after data loads).
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    // Always restore the top bar when leaving the Feed route
    document.documentElement.classList.remove('topbar--scrolled-down');
    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }
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
