import { Component, inject, OnInit, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SocialFacade } from '../../../core/facade/social.facade';
import { ChatFacade } from '../../../core/facade/chat.facade';
import { UserFacade } from '../../../core/facade/user.facade';
import { UserStore } from '../../../core/store/user.store';
import { AuthenticationStore } from '../../../core/store/auth.store';
import { CreatePostComponent } from '../components/create-post/create-post.component';
import { CreateContentComponent } from '../components/create-content/create-content.component';
import { EditPostComponent } from '../components/edit-post/edit-post.component';
import { WriteArticleComponent } from '../components/write-article/write-article.component';
import { Post, ProfileBlog } from '../../../core/models/social.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AlertService } from '../../../shared/services/alert.service';
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
  private readonly userFacade = inject(UserFacade);
  private readonly alert = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);
  private readonly authStore = inject(AuthenticationStore);
  private readonly dialog = inject(MatDialog);

  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  readonly skeletonCells = Array.from({ length: 9 });
  readonly isFollowing = signal(false);
  readonly isTogglingFollow = signal(false);
  readonly brokenImages = new Set<number>();

  readonly activeTab = signal<ProfileTab>('posts');
  readonly showMoreMenu = signal(false);
  readonly showArchivedSection = signal(false);
  readonly openBlogMenuId = signal<number | null>(null);
  readonly expandedArticles = signal<Set<number>>(new Set());

  // Inline bio edit
  readonly isEditingBio = signal(false);
  readonly bioInput = signal('');

  protected userId = '';

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('userId') ?? 'me';
    this.userId =
      paramId === 'me'
        ? (this.userStore.user()?.id ?? this.authStore.authUser()?.id ?? '')
        : paramId;

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

  toggleArticleExpand(e: Event, id: number): void {
    e.stopPropagation();
    this.expandedArticles.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isArticleExpanded(id: number): boolean {
    return this.expandedArticles().has(id);
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
    const isMobile = window.innerWidth <= 640;
    this.dialog
      .open(CreateContentComponent, {
        panelClass: 'create-post-panel',
        maxWidth: isMobile ? '100vw' : '600px',
        width: '100%',
        position: isMobile ? { bottom: '0' } : undefined,
      })
      .afterClosed()
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
    const isMobile = window.innerWidth <= 640;
    this.dialog.open(EditPostComponent, {
      data: { post },
      panelClass: 'edit-post-panel',
      maxWidth: isMobile ? '100vw' : '560px',
      width: '100%',
      position: isMobile ? { bottom: '0' } : undefined,
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

  // ── Avatar upload ──────────────────────────────────────────────────────────

  async onAvatarFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (file.size > 2 * 1024 * 1024) {
      this.alert.error('Image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) return;
      await this.userFacade.saveUserProfile({ imageUrl: dataUrl });
      await this.facade.loadProfile(this.userId);
    };
    reader.readAsDataURL(file);
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
