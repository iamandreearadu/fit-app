import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SocialFacade } from '../../../core/facade/social.facade';
import { Post, UserSummary } from '../../../core/models/social.model';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { EditPostComponent } from '../components/edit-post/edit-post.component';

@Component({
  selector: 'app-social-discover',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PostCardComponent
  ],
  templateUrl: './social-discover.component.html',
  styleUrl: './social-discover.component.css'
})
export class SocialDiscoverComponent implements OnInit, OnDestroy {
  protected readonly facade = inject(SocialFacade);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly followingUsers = signal<Set<string>>(new Set());
  readonly skeletons = Array.from({ length: 4 });
  readonly searchQuery = signal('');

  private readonly searchInput$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly uniqueAuthors = computed((): UserSummary[] => {
    const seen = new Set<string>();
    return this.facade.discoverPosts()
      .map(p => p.author)
      .filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
  });

  readonly isSearchMode = computed(() => this.searchQuery().trim().length > 0);

  ngOnInit(): void {
    this.facade.loadDiscover();

    this.searchInput$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => {
      if (q.trim()) {
        this.facade.searchUsers(q);
      } else {
        this.facade.clearSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.facade.clearSearch();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  clearSearchInput(): void {
    this.searchQuery.set('');
    this.facade.clearSearch();
  }

  async onFollow(userId: string): Promise<void> {
    try {
      const res = await this.facade.toggleFollow(userId);
      this.followingUsers.update(set => {
        const next = new Set(set);
        if (res.isFollowing) next.add(userId); else next.delete(userId);
        return next;
      });
    } catch { /* silently ignore */ }
  }

  isFollowing(userId: string): boolean {
    return this.followingUsers().has(userId);
  }

  onPostComment(postId: number): void {
    this.router.navigate(['/social/post', postId]);
  }

  onLike(postId: number): void {
    this.facade.toggleLike(postId);
  }

  onFollowFromPost(userId: string): void {
    this.onFollow(userId);
  }

  onDeleteFromPost(postId: number): void {
    this.facade.deletePost(postId);
  }

  onEditFromPost(post: Post): void {
    this.dialog.open(EditPostComponent, {
      data: { post },
      panelClass: 'create-post-panel',
      maxWidth: '560px',
      width: '100%'
    });
  }
}
