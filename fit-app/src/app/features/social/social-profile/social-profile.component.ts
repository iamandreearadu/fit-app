import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SocialFacade } from '../../../core/facade/social.facade';
import { ChatFacade } from '../../../core/facade/chat.facade';
import { UserStore } from '../../../core/store/user.store';
import { CreatePostComponent } from '../components/create-post/create-post.component';
import { CreateContentComponent } from '../components/create-content/create-content.component';
import { EditPostComponent } from '../components/edit-post/edit-post.component';
import { WriteArticleComponent } from '../components/write-article/write-article.component';
import { Post, ProfileBlog } from '../../../core/models/social.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatsTabComponent } from './stats-tab/stats-tab.component';

type ProfileTab = 'posts' | 'workouts' | 'blogs' | 'stats';

@Component({
  selector: 'app-social-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    StatsTabComponent,
  ],
  templateUrl: './social-profile.component.html',
  styleUrl: './social-profile.component.css',
})
export class SocialProfileComponent implements OnInit {
  protected readonly facade = inject(SocialFacade);
  private readonly chatFacade = inject(ChatFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);
  private readonly dialog = inject(MatDialog);

  readonly skeletonCells = Array.from({ length: 9 });
  readonly isFollowing = signal(false);
  readonly isTogglingFollow = signal(false);
  readonly brokenImages = new Set<number>();

  readonly activeTab = signal<ProfileTab>('posts');
  readonly showMoreMenu = signal(false);
  readonly showArchivedSection = signal(false);
  readonly openBlogMenuId = signal<number | null>(null);

  // Inline bio edit
  readonly isEditingBio = signal(false);
  readonly bioInput = signal('');

  protected userId = '';

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('userId') ?? 'me';
    this.userId =
      paramId === 'me' ? (this.userStore.user()?.id ?? '') : paramId;

    this.facade.loadProfile(this.userId).then(() => {
      const profile = this.facade.currentProfile();
      if (profile) this.isFollowing.set(profile.isFollowedByMe);
    });
    this.facade.loadProfileWorkouts(this.userId);
    this.facade.loadProfileBlogs(this.userId);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showMoreMenu.set(false);
    this.openBlogMenuId.set(null);
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    this.showArchivedSection.set(false);
  }

  toggleMoreMenu(e: Event): void {
    e.stopPropagation();
    this.showMoreMenu.update((v) => !v);
  }

  toggleBlogMenu(e: Event, blogId: number): void {
    e.stopPropagation();
    this.openBlogMenuId.update((id) => (id === blogId ? null : blogId));
  }

  openArchived(e: Event): void {
    e.stopPropagation();
    this.showMoreMenu.set(false);
    this.showArchivedSection.set(true);
    this.facade.loadArchivedPosts(this.userId);
  }

  closeArchived(): void {
    this.showArchivedSection.set(false);
  }

  startEditBio(e?: Event): void {
    e?.stopPropagation();
    this.showMoreMenu.set(false);
    this.bioInput.set(this.facade.currentProfile()?.bio ?? '');
    this.isEditingBio.set(true);
  }

  cancelEditBio(): void {
    this.isEditingBio.set(false);
  }

  async saveBio(): Promise<void> {
    const bio = this.bioInput().trim() || null;
    await this.facade.updateBio(bio);
    this.isEditingBio.set(false);
  }

  async toggleFollow(): Promise<void> {
    if (this.isTogglingFollow()) return;
    this.isTogglingFollow.set(true);
    try {
      const res = await this.facade.toggleFollow(this.userId);
      this.isFollowing.set(res.isFollowing);
    } finally {
      this.isTogglingFollow.set(false);
    }
  }

  openCreatePost(): void {
    this.dialog
      .open(CreateContentComponent, {
        panelClass: 'create-post-panel',
        maxWidth: '600px',
        width: '100%',
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((created) => {
        if (created) {
          this.facade.loadProfile(this.userId);
          this.facade.loadProfileBlogs(this.userId);
        }
      });
  }

  openPostDetail(postId: number): void {
    this.router.navigate(['/social/post', postId], {
      state: { returnUrl: `/social/profile/${this.userId}` },
    });
  }

  openArticleDetail(articleId: number): void {
    this.router.navigate(['/social/article', articleId], {
      state: { returnUrl: `/social/profile/${this.userId}` },
    });
  }

  async messageUser(): Promise<void> {
    try {
      const conv = await this.chatFacade.createConversation({
        targetUserId: this.userId,
      });
      this.router.navigate(['/social/chat', conv.id]);
    } catch {
      this.router.navigate(['/social/chat']);
    }
  }

  // ── Post actions ───────────────────────────────────────────────────────────

  editPost(e: Event, post: Post): void {
    e.stopPropagation();
    this.dialog.open(EditPostComponent, {
      data: { post },
      panelClass: 'create-post-panel',
      maxWidth: '560px',
      width: '100%',
    });
  }

  async deletePost(e: Event, postId: number): Promise<void> {
    e.stopPropagation();
    const confirmed = await this.confirmDelete(
      'Are you sure you want to delete this post?',
    );
    if (!confirmed) return;
    await this.facade.deletePost(postId);
  }

  async archivePost(e: Event, postId: number): Promise<void> {
    e.stopPropagation();
    await this.facade.archivePost(postId);
  }

  async unarchivePost(e: Event, postId: number): Promise<void> {
    e.stopPropagation();
    await this.facade.unarchivePost(postId);
  }

  // ── Workout actions ────────────────────────────────────────────────────────

  editWorkout(e: Event, workoutId: number): void {
    e.stopPropagation();
    this.router.navigate(['/workouts', workoutId, 'edit']);
  }

  async deleteWorkout(e: Event, workoutId: number): Promise<void> {
    e.stopPropagation();
    const confirmed = await this.confirmDelete(
      'Are you sure you want to delete this workout?',
    );
    if (!confirmed) return;
    await this.facade.deleteWorkout(workoutId);
  }

  async archiveWorkout(e: Event, workoutId: number): Promise<void> {
    e.stopPropagation();
    await this.facade.archiveWorkout(workoutId);
  }

  // ── Blog actions ───────────────────────────────────────────────────────────

  openWriteArticle(): void {
    this.dialog
      .open(WriteArticleComponent, {
        data: null,
        panelClass: 'create-post-panel',
        maxWidth: '600px',
        width: '100%',
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((published) => {
        if (published) this.facade.loadProfileBlogs(this.userId);
      });
  }

  editBlog(e: Event, blog: ProfileBlog): void {
    e.stopPropagation();
    this.dialog
      .open(WriteArticleComponent, {
        data: { blog },
        panelClass: 'create-post-panel',
        maxWidth: '600px',
        width: '100%',
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((saved) => {
        if (saved) this.facade.loadProfileBlogs(this.userId);
      });
  }

  async deleteBlog(e: Event, blogId: number): Promise<void> {
    e.stopPropagation();
    const confirmed = await this.confirmDelete(
      'Are you sure you want to delete this article?',
    );
    if (!confirmed) return;
    await this.facade.deleteBlog(blogId);
  }

  async archiveBlog(e: Event, blogId: number): Promise<void> {
    e.stopPropagation();
    await this.facade.archiveBlog(blogId);
  }

  // ── Shared confirm helper ──────────────────────────────────────────────────

  private confirmDelete(message: string): Promise<boolean> {
    return firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { message, dangerous: true },
          panelClass: 'confirm-dialog-panel',
          maxWidth: '360px',
          width: '100%',
        })
        .afterClosed(),
    ).then((r) => !!r);
  }
}
