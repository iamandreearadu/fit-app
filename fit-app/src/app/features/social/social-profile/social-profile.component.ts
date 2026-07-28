import { Component, DestroyRef, effect, inject, OnInit, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SocialProfileFacade } from '../../../core/facade/social-profile.facade';
import { SocialContentFacade } from '../../../core/facade/social-content.facade';
import { ChatFacade } from '../../../core/facade/chat.facade';
import { UserFacade } from '../../../core/facade/user.facade';
import { UserStore } from '../../../core/store/user.store';
import { AuthenticationStore } from '../../../core/store/auth.store';
import { EditPostComponent } from '../components/edit-post/edit-post.component';
import { Post } from '../../../core/models/social.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AlertService } from '../../../shared/services/alert.service';
import { StatsTabComponent } from './stats-tab/stats-tab.component';

type ProfileTab = 'posts' | 'workouts' | 'meals' | 'stats';

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
  protected readonly facade = inject(SocialProfileFacade);
  private readonly content = inject(SocialContentFacade);
  private readonly chatFacade = inject(ChatFacade);
  private readonly userFacade = inject(UserFacade);
  private readonly alert = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);
  private readonly authStore = inject(AuthenticationStore);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('followListHeading') followListHeadingRef?: ElementRef<HTMLElement>;

  readonly skeletonCells = Array.from({ length: 9 });
  readonly isFollowing = signal(false);
  readonly isTogglingFollow = signal(false);
  readonly brokenImages = new Set<number>();
  readonly isSavingBio = signal(false);
  readonly isUploadingAvatar = signal(false);
  readonly avatarError = signal<string | null>(null);
  readonly pendingActions = signal<Set<string>>(new Set());
  private followListTrigger: HTMLElement | null = null;

  readonly tabs: readonly ProfileTab[] = ['posts', 'workouts', 'meals', 'stats'];
  readonly mealView = signal<'visible' | 'hidden'>('visible');
  readonly workoutView = signal<'visible' | 'hidden'>('visible');

  readonly activeTab = signal<ProfileTab>('posts');
  readonly showMoreMenu = signal(false);
  readonly showArchivedSection = signal(false);

  // Inline bio edit
  readonly isEditingBio = signal(false);
  readonly bioInput = signal('');
  readonly bioExpanded = signal(false);

  protected userId = '';
  private readonly routeUserId = signal<string | null>(null);
  private loadedUserId: string | null = null;

  constructor() {
    effect(() => {
      const routeUserId = this.routeUserId();
      if (!routeUserId) return;

      const resolvedUserId = routeUserId === 'me'
        ? (this.userStore.user()?.id ?? this.authStore.authUser()?.id ?? '')
        : routeUserId;
      if (!resolvedUserId || resolvedUserId === this.loadedUserId) return;

      this.loadedUserId = resolvedUserId;
      this.userId = resolvedUserId;
      void Promise.all([
        this.facade.loadProfile(resolvedUserId).then(() => {
          const profile = this.facade.currentProfile();
          if (profile) {
            this.isFollowing.set(profile.isFollowedByMe);
            if (profile.isOwnProfile) void this.facade.loadArchivedWorkouts(resolvedUserId);
          }
        }),
        this.facade.loadProfileWorkouts(resolvedUserId),
        this.facade.loadProfileMeals(resolvedUserId),
      ]);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.loadedUserId = null;
      this.routeUserId.set(params.get('userId') ?? 'me');

      // Load all profile data in parallel — avoids sequential waterfall
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showMoreMenu.set(false);
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    this.showArchivedSection.set(false);
  }

  onTabKeydown(event: KeyboardEvent, currentTab: ProfileTab): void {
    let index = this.tabs.indexOf(currentTab);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = this.tabs.length - 1;
    else if (event.key === 'ArrowRight') index = (index + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') index = (index - 1 + this.tabs.length) % this.tabs.length;
    else return;
    event.preventDefault();
    this.setTab(this.tabs[index]);
    document.getElementById(`profile-tab-${this.tabs[index]}`)?.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.facade.followListType()) this.closeFollowList();
    else if (this.showArchivedSection()) this.closeArchived();
    else {
      this.showMoreMenu.set(false);
    }
  }

  toggleMoreMenu(e: Event): void {
    e.stopPropagation();
    this.showMoreMenu.update((v) => !v);
  }

  openArchived(e: Event): void {
    e.stopPropagation();
    this.showMoreMenu.set(false);
    this.showArchivedSection.set(true);
    this.facade.loadArchivedPosts(this.userId);
    this.facade.loadArchivedWorkouts(this.userId);
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
    if (this.isSavingBio()) return;
    const bio = this.bioInput().trim() || null;
    this.isSavingBio.set(true);
    try {
      await this.facade.updateBio(bio);
      this.isEditingBio.set(false);
      this.alert.success('Bio updated.');
    } catch {
      this.alert.error('Could not update your bio. Please try again.');
    } finally {
      this.isSavingBio.set(false);
    }
  }

  async toggleFollow(): Promise<void> {
    if (this.isTogglingFollow()) return;
    this.isTogglingFollow.set(true);
    try {
      await this.facade.toggleFollow(this.userId);
      this.isFollowing.set(this.facade.currentProfile()?.isFollowedByMe ?? false);
    } catch {
      this.alert.error('Could not update follow status. Please try again.');
    } finally {
      this.isTogglingFollow.set(false);
    }
  }

  openCreatePost(): void {
    this.router.navigate(['/social/new-post'], { state: { returnUrl: this.router.url } });
  }

  openPostDetail(postId: number): void {
    this.router.navigate(['/social/post', postId], {
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

  // ── Follow list ─────────────────────────────────────────────────────────────

  openFollowList(type: 'followers' | 'following', trigger?: Event): void {
    this.followListTrigger = trigger?.currentTarget as HTMLElement | null;
    this.facade.loadFollowList(this.userId, type);
    setTimeout(() => this.followListHeadingRef?.nativeElement.focus());
  }


  closeFollowList(): void {
    this.facade.closeFollowList();
    setTimeout(() => this.followListTrigger?.focus());
  }

  loadMoreFollowList(): void {
    this.facade.loadMoreFollowList(this.userId);
  }

  async toggleFollowUser(targetUserId: string): Promise<void> {
    const key = `follow:${targetUserId}`;
    if (this.isPending(key)) return;
    this.setPending(key, true);
    try {
      const res = await this.content.toggleFollow(targetUserId);
    // Update the follow list item in-place
    this.facade.followListUsers.update(users =>
      users.map(u => u.id === targetUserId
        ? { ...u, isFollowedByMe: res.isFollowing }
        : u
      )
    );
    // Reload profile to update counts
      this.facade.loadProfile(this.userId);
    } finally {
      this.setPending(key, false);
    }
  }

  navigateToProfile(userId: string): void {
    this.closeFollowList();
    this.router.navigate(['/social/profile', userId]);
  }

    // ── Post actions ───────────────────────────────────────────────────────────

  editPost(e: Event, post: Post): void {
    e.stopPropagation();
    this.openEditPost(post);
  }

  private openEditPost(post: Post): void {
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
    await this.confirmAndDeletePost(postId);
  }

  private async confirmAndDeletePost(postId: number): Promise<void> {
    const confirmed = await this.confirmDelete(
      'Are you sure you want to delete this post?',
    );
    if (!confirmed) return;
    await this.runMutation(`post:${postId}`, () => this.content.deletePost(postId));
  }

  async archivePost(e: Event, postId: number): Promise<void> {
    e.stopPropagation();
    await this.runMutation(`post:${postId}`, () => this.facade.archivePost(postId), 'Post archived.');
  }

  async unarchivePost(e: Event, postId: number): Promise<void> {
    e.stopPropagation();
    await this.runMutation(`post:${postId}`, () => this.facade.unarchivePost(postId), 'Post restored.');
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
    await this.runMutation(`workout:${workoutId}`, () => this.facade.deleteWorkout(workoutId));
  }

  async archiveWorkout(e: Event, workoutId: number): Promise<void> {
    e.stopPropagation();
    await this.runMutation(`workout:${workoutId}`, () => this.facade.archiveWorkout(workoutId));
  }

  async unarchiveWorkout(e: Event, workoutId: number): Promise<void> {
    e.stopPropagation();
    await this.runMutation(`workout:${workoutId}`, () => this.facade.unarchiveWorkout(workoutId), 'Workout restored.');
  }

  // ── Blog actions ───────────────────────────────────────────────────────────

  // ── Avatar upload ──────────────────────────────────────────────────────────

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.parentElement?.querySelector('.profile-avatar--fallback') as HTMLElement | null;
    if (fallback) fallback.style.display = 'flex';
  }

  async onAvatarFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    this.avatarError.set(null);
    if (!file.type.startsWith('image/')) {
      this.avatarError.set('Choose a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError.set('Image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) return;
      this.isUploadingAvatar.set(true);
      try {
        await this.userFacade.saveUserProfile({ imageUrl: dataUrl });
        await this.facade.loadProfile(this.userId);
      } catch {
        this.avatarError.set('Could not update your photo. Please try again.');
      } finally {
        this.isUploadingAvatar.set(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async toggleMealVisibility(e: Event, mealId: number): Promise<void> {
    e.stopPropagation();
    await this.runMutation(`meal:${mealId}`, () => this.facade.toggleMealVisibility(mealId));
  }

  retrySection(section: 'workouts' | 'archive'): void {
    const request = section === 'workouts'
      ? this.facade.loadProfileWorkouts(this.userId)
      : Promise.all([this.facade.loadArchivedPosts(this.userId), this.facade.loadArchivedWorkouts(this.userId)]).then(() => undefined);
    void request;
  }

  hasSectionError(section: 'workouts' | 'archive'): boolean {
    if (section === 'archive') return !!(this.facade.archivedPostsError() || this.facade.archivedWorkoutsError());
    return !!this.facade.profileWorkoutsError();
  }

  isPending(key: string): boolean { return this.pendingActions().has(key); }

  private setPending(key: string, pending: boolean): void {
    this.pendingActions.update(current => {
      const next = new Set(current);
      pending ? next.add(key) : next.delete(key);
      return next;
    });
  }

  private async runMutation(key: string, action: () => Promise<void>, success?: string): Promise<void> {
    if (this.isPending(key)) return;
    this.setPending(key, true);
    try {
      await action();
      if (success) this.alert.success(success);
    } catch {
      this.alert.error('The action could not be completed. Please try again.');
    } finally {
      this.setPending(key, false);
    }
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
