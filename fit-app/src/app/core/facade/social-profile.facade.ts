import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { StatsService } from '../../api/stats.service';
import { AlertService } from '../../shared/services/alert.service';
import {
  Post,
  UserSocialProfile,
  ProfileWorkout,
  ProfileMeal,
  ProfileBlog,
  CreateBlogRequest,
  UpdateBlogRequest,
  FollowUser,
} from '../models/social.model';
import { UserPublicStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class SocialProfileFacade {
  private readonly socialSvc = inject(SocialService);
  private readonly statsSvc = inject(StatsService);
  private readonly alerts = inject(AlertService);

  // ── Profile ───────────────────────────────────────────────────────────────────
  readonly currentProfile = signal<UserSocialProfile | null>(null);
  readonly profilePosts = signal<Post[]>([]);
  readonly isLoadingProfile = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly isLoadingProfilePosts = signal(false);
  readonly profilePostsError = signal<string | null>(null);
  readonly profilePostsHasMore = signal(false);

  // ── Profile sections ──────────────────────────────────────────────────────────
  readonly profileWorkouts = signal<ProfileWorkout[]>([]);
  readonly profileMeals = signal<ProfileMeal[]>([]);
  readonly hiddenProfileMeals = signal<ProfileMeal[]>([]);
  readonly isLoadingProfileMeals = signal(false);
  readonly profileMealsError = signal<string | null>(null);
  readonly profileBlogs = signal<ProfileBlog[]>([]);
  readonly archivedPosts = signal<Post[]>([]);
  readonly archivedWorkouts = signal<ProfileWorkout[]>([]);
  readonly archivedBlogs = signal<ProfileBlog[]>([]);
  readonly profileWorkoutsHasMore = signal(false);
  readonly profileBlogsHasMore = signal(false);
  readonly archivedPostsHasMore = signal(false);
  readonly archivedWorkoutsHasMore = signal(false);
  readonly archivedBlogsHasMore = signal(false);
  readonly isLoadingProfileWorkouts = signal(false);
  readonly isLoadingProfileBlogs = signal(false);
  readonly isLoadingArchivedPosts = signal(false);
  readonly isLoadingArchivedWorkouts = signal(false);
  readonly isLoadingArchivedBlogs = signal(false);
  readonly profileWorkoutsError = signal<string | null>(null);
  readonly profileBlogsError = signal<string | null>(null);
  readonly archivedPostsError = signal<string | null>(null);
  readonly archivedWorkoutsError = signal<string | null>(null);
  readonly archivedBlogsError = signal<string | null>(null);
  /** Compatibility aggregate for the current profile template. */
  readonly isLoadingProfileSections = computed(() =>
    this.isLoadingProfileWorkouts() || this.isLoadingProfileBlogs()
    || this.isLoadingArchivedPosts() || this.isLoadingArchivedWorkouts() || this.isLoadingArchivedBlogs());
  /** Compatibility aggregate; new consumers should use the resource-specific errors. */
  readonly profileSectionsError = computed(() =>
    this.profileWorkoutsError() ?? this.profileBlogsError()
    ?? this.archivedPostsError() ?? this.archivedWorkoutsError() ?? this.archivedBlogsError());

  readonly pendingMutations = signal<ReadonlySet<string>>(new Set());
  readonly mutationError = signal<string | null>(null);

  private activeUserId: string | null = null;
  private requestSequence = 0;
  private readonly latestRequest = new Map<string, number>();
  private readonly pages = new Map<string, number>();

  // ── Follow list ───────────────────────────────────────────────────────────────
  readonly followListUsers = signal<FollowUser[]>([]);
  readonly followListType = signal<'followers' | 'following' | null>(null);
  readonly isLoadingFollowList = signal(false);
  readonly followListHasMore = signal(false);
  private followListPage = 1;

  // ── Public stats ──────────────────────────────────────────────────────────────
  readonly publicStats = signal<UserPublicStats | null>(null);
  readonly isLoadingPublicStats = signal(false);
  readonly publicStatsError = signal<string | null>(null);

  // ── Profile methods ───────────────────────────────────────────────────────────

  async loadProfile(userId: string): Promise<void> {
    if (!userId) {
      this.resetProfileContext(null);
      this.profileError.set('A valid user is required to load a profile.');
      return;
    }
    this.ensureProfileContext(userId);
    const profileRequest = this.startRequest('profile');
    const postsRequest = this.startRequest('posts');
    this.isLoadingProfile.set(true);
    this.isLoadingProfilePosts.set(true);
    this.profileError.set(null);
    this.profilePostsError.set(null);

    const profileTask = firstValueFrom(this.socialSvc.getProfile(userId))
      .then(profile => {
        if (this.isCurrentRequest('profile', profileRequest, userId)) this.currentProfile.set(profile);
      })
      .catch(() => {
        if (this.isCurrentRequest('profile', profileRequest, userId)) {
          this.profileError.set('Failed to load profile. Please try again.');
        }
      })
      .finally(() => {
        if (this.isCurrentRequest('profile', profileRequest, userId)) this.isLoadingProfile.set(false);
      });

    const postsTask = firstValueFrom(this.socialSvc.getProfilePosts(userId))
      .then(posts => {
        if (this.isCurrentRequest('posts', postsRequest, userId)) {
          this.profilePosts.set(posts.items);
          this.profilePostsHasMore.set(posts.hasMore);
          this.pages.set('posts', 2);
        }
      })
      .catch(() => {
        if (this.isCurrentRequest('posts', postsRequest, userId)) {
          this.profilePostsError.set('Failed to load posts. Please try again.');
        }
      })
      .finally(() => {
        if (this.isCurrentRequest('posts', postsRequest, userId)) this.isLoadingProfilePosts.set(false);
      });

    await Promise.allSettled([profileTask, postsTask]);
  }

  async loadMoreProfilePosts(userId: string): Promise<void> {
    if (!this.profilePostsHasMore() || this.isLoadingProfilePosts()) return;
    const request = this.startRequest('posts');
    const page = this.pages.get('posts') ?? 2;
    this.isLoadingProfilePosts.set(true);
    this.profilePostsError.set(null);
    try {
      const res = await firstValueFrom(this.socialSvc.getProfilePosts(userId, page));
      if (this.isCurrentRequest('posts', request, userId)) {
        this.profilePosts.update(items => this.mergeUnique(items, res.items));
        this.profilePostsHasMore.set(res.hasMore);
        this.pages.set('posts', page + 1);
      }
    } catch {
      if (this.isCurrentRequest('posts', request, userId)) this.profilePostsError.set('Failed to load posts. Please try again.');
    } finally {
      if (this.isCurrentRequest('posts', request, userId)) this.isLoadingProfilePosts.set(false);
    }
  }

  async updateBio(bio: string | null): Promise<void> {
    await this.runMutation('bio', async () => {
      await firstValueFrom(this.socialSvc.updateBio(bio));
      this.currentProfile.update(p => p ? { ...p, bio: bio ?? undefined } : p);
    });
  }

  // ── Profile sections ──────────────────────────────────────────────────────────

  async loadProfileWorkouts(userId: string, reset = true): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('workouts');
    this.isLoadingProfileWorkouts.set(true);
    this.profileWorkoutsError.set(null);
    try {
      const page = reset ? 1 : (this.pages.get('workouts') ?? 2);
      const res = await firstValueFrom(this.socialSvc.getProfileWorkouts(userId, page));
      if (this.isCurrentRequest('workouts', request, userId)) {
        this.profileWorkouts.update(items => reset ? res.items : this.mergeUnique(items, res.items));
        this.profileWorkoutsHasMore.set(res.hasMore);
        this.pages.set('workouts', page + 1);
      }
    } catch {
      if (this.isCurrentRequest('workouts', request, userId)) this.profileWorkoutsError.set('Failed to load workouts.');
    } finally {
      if (this.isCurrentRequest('workouts', request, userId)) this.isLoadingProfileWorkouts.set(false);
    }
  }

  async loadMoreProfileWorkouts(userId: string): Promise<void> {
    if (!this.profileWorkoutsHasMore() || this.isLoadingProfileWorkouts()) return;
    await this.loadProfileWorkouts(userId, false);
  }

  async loadProfileMeals(userId: string): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('meals');
    this.isLoadingProfileMeals.set(true);
    this.profileMealsError.set(null);
    try {
      const visible = await firstValueFrom(this.socialSvc.getProfileMeals(userId, 1, 50));
      if (!this.isCurrentRequest('meals', request, userId)) return;
      this.profileMeals.set(visible.items);
      try {
        const hidden = await firstValueFrom(this.socialSvc.getHiddenProfileMeals(userId, 1, 50));
        if (this.isCurrentRequest('meals', request, userId)) this.hiddenProfileMeals.set(hidden.items);
      } catch { this.hiddenProfileMeals.set([]); }
    } catch {
      if (this.isCurrentRequest('meals', request, userId)) this.profileMealsError.set('Failed to load meals.');
    } finally {
      if (this.isCurrentRequest('meals', request, userId)) this.isLoadingProfileMeals.set(false);
    }
  }

  async toggleMealVisibility(id: number): Promise<void> {
    await this.runMutation(`meal:${id}`, async () => {
      const result = await firstValueFrom(this.socialSvc.toggleMealVisibility(id));
      const source = result.isHiddenFromProfile ? this.profileMeals : this.hiddenProfileMeals;
      const target = result.isHiddenFromProfile ? this.hiddenProfileMeals : this.profileMeals;
      const meal = source().find(item => item.id === id);
      source.update(items => items.filter(item => item.id !== id));
      if (meal) target.update(items => [{ ...meal, isHiddenFromProfile: result.isHiddenFromProfile }, ...items]);
    });
  }

  async loadProfileBlogs(userId: string, reset = true): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('blogs');
    this.isLoadingProfileBlogs.set(true);
    this.profileBlogsError.set(null);
    try {
      const page = reset ? 1 : (this.pages.get('blogs') ?? 2);
      const res = await firstValueFrom(this.socialSvc.getProfileBlogs(userId, page));
      if (this.isCurrentRequest('blogs', request, userId)) {
        this.profileBlogs.update(items => reset ? res.items : this.mergeUnique(items, res.items));
        this.profileBlogsHasMore.set(res.hasMore);
        this.pages.set('blogs', page + 1);
      }
    } catch {
      if (this.isCurrentRequest('blogs', request, userId)) this.profileBlogsError.set('Failed to load articles.');
    } finally {
      if (this.isCurrentRequest('blogs', request, userId)) this.isLoadingProfileBlogs.set(false);
    }
  }

  async loadArchivedPosts(userId: string, reset = true): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('archived-posts');
    this.isLoadingArchivedPosts.set(true);
    this.archivedPostsError.set(null);
    try {
      const page = reset ? 1 : (this.pages.get('archived-posts') ?? 2);
      const res = await firstValueFrom(this.socialSvc.getArchivedPosts(userId, page));
      if (this.isCurrentRequest('archived-posts', request, userId)) {
        this.archivedPosts.update(items => reset ? res.items : this.mergeUnique(items, res.items));
        this.archivedPostsHasMore.set(res.hasMore);
        this.pages.set('archived-posts', page + 1);
      }
    } catch {
      if (this.isCurrentRequest('archived-posts', request, userId)) this.archivedPostsError.set('Failed to load archived posts.');
    } finally {
      if (this.isCurrentRequest('archived-posts', request, userId)) this.isLoadingArchivedPosts.set(false);
    }
  }

  async loadArchivedWorkouts(userId: string, reset = true): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('archived-workouts');
    this.isLoadingArchivedWorkouts.set(true);
    this.archivedWorkoutsError.set(null);
    try {
      const page = reset ? 1 : (this.pages.get('archived-workouts') ?? 2);
      const res = await firstValueFrom(this.socialSvc.getArchivedWorkouts(userId, page));
      if (this.isCurrentRequest('archived-workouts', request, userId)) {
        this.archivedWorkouts.update(items => reset ? res.items : this.mergeUnique(items, res.items));
        this.archivedWorkoutsHasMore.set(res.hasMore);
        this.pages.set('archived-workouts', page + 1);
      }
    } catch {
      if (this.isCurrentRequest('archived-workouts', request, userId)) this.archivedWorkoutsError.set('Failed to load archived workouts.');
    } finally {
      if (this.isCurrentRequest('archived-workouts', request, userId)) this.isLoadingArchivedWorkouts.set(false);
    }
  }

  async loadMoreArchivedPosts(userId: string): Promise<void> {
    if (!this.archivedPostsHasMore() || this.isLoadingArchivedPosts()) return;
    await this.loadArchivedPosts(userId, false);
  }

  async loadMoreArchivedWorkouts(userId: string): Promise<void> {
    if (!this.archivedWorkoutsHasMore() || this.isLoadingArchivedWorkouts()) return;
    await this.loadArchivedWorkouts(userId, false);
  }

  async loadArchivedBlogs(userId: string, reset = true): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('archived-blogs');
    this.isLoadingArchivedBlogs.set(true);
    this.archivedBlogsError.set(null);
    try {
      const page = reset ? 1 : (this.pages.get('archived-blogs') ?? 2);
      const res = await firstValueFrom(this.socialSvc.getArchivedBlogs(userId, page));
      if (this.isCurrentRequest('archived-blogs', request, userId)) {
        this.archivedBlogs.update(items => reset ? res.items : this.mergeUnique(items, res.items));
        this.archivedBlogsHasMore.set(res.hasMore);
        this.pages.set('archived-blogs', page + 1);
      }
    } catch {
      if (this.isCurrentRequest('archived-blogs', request, userId)) this.archivedBlogsError.set('Failed to load archived articles.');
    } finally {
      if (this.isCurrentRequest('archived-blogs', request, userId)) this.isLoadingArchivedBlogs.set(false);
    }
  }

  async loadMoreArchivedBlogs(userId: string): Promise<void> {
    if (!this.archivedBlogsHasMore() || this.isLoadingArchivedBlogs()) return;
    await this.loadArchivedBlogs(userId, false);
  }

  async archivePost(id: number): Promise<void> {
    await this.runMutation(`archive-post:${id}`, async () => {
      await firstValueFrom(this.socialSvc.archivePost(id));
      this.profilePosts.update(f => f.filter(p => p.id !== id));
    });
  }

  async unarchivePost(id: number): Promise<void> {
    await this.runMutation(`archive-post:${id}`, async () => {
      await firstValueFrom(this.socialSvc.archivePost(id));
      this.archivedPosts.update(f => f.filter(p => p.id !== id));
    });
  }

  async archiveWorkout(id: number): Promise<void> {
    await this.runMutation(`archive-workout:${id}`, async () => {
      await firstValueFrom(this.socialSvc.archiveWorkout(id));
      const workout = this.profileWorkouts().find(w => w.id === id);
      this.profileWorkouts.update(f => f.filter(w => w.id !== id));
      if (workout) this.archivedWorkouts.update(f => [{ ...workout, isArchived: true }, ...f]);
    });
  }

  async unarchiveWorkout(id: number): Promise<void> {
    await this.runMutation(`archive-workout:${id}`, async () => {
      await firstValueFrom(this.socialSvc.archiveWorkout(id));
      const workout = this.archivedWorkouts().find(w => w.id === id);
      this.archivedWorkouts.update(f => f.filter(w => w.id !== id));
      if (workout) this.profileWorkouts.update(f => [{ ...workout, isArchived: false }, ...f]);
    });
  }

  async deleteWorkout(id: number): Promise<void> {
    await this.runMutation(`delete-workout:${id}`, async () => {
      await firstValueFrom(this.socialSvc.deleteWorkout(id));
      this.profileWorkouts.update(f => f.filter(w => w.id !== id));
      this.archivedWorkouts.update(f => f.filter(w => w.id !== id));
    });
  }

  async archiveBlog(id: number): Promise<void> {
    await this.runMutation(`archive-blog:${id}`, async () => {
      await firstValueFrom(this.socialSvc.archiveBlog(id));
      this.profileBlogs.update(f => f.filter(b => b.id !== id));
    });
  }

  async deleteBlog(id: number): Promise<void> {
    await this.runMutation(`delete-blog:${id}`, async () => {
      await firstValueFrom(this.socialSvc.deleteBlog(id));
      this.profileBlogs.update(f => f.filter(b => b.id !== id));
    });
  }

  async createBlog(req: CreateBlogRequest): Promise<void> {
    await this.runMutation('create-blog', async () => {
      const blog = await firstValueFrom(this.socialSvc.createBlog(req));
      this.profileBlogs.update(f => [blog, ...f]);
    });
  }

  async updateBlogPost(id: number, req: UpdateBlogRequest): Promise<void> {
    await this.runMutation(`update-blog:${id}`, async () => {
      const updated = await firstValueFrom(this.socialSvc.updateBlogPost(id, req));
      this.profileBlogs.update(f => f.map(b => b.id === id ? updated : b));
    });
  }

  async unarchiveBlog(id: number): Promise<void> {
    await this.runMutation(`archive-blog:${id}`, async () => {
      await firstValueFrom(this.socialSvc.archiveBlog(id));
      this.archivedBlogs.update(items => items.filter(blog => blog.id !== id));
    });
  }

  async loadMoreProfileBlogs(userId: string): Promise<void> {
    if (!this.profileBlogsHasMore() || this.isLoadingProfileBlogs()) return;
    await this.loadProfileBlogs(userId, false);
  }

  async toggleFollow(userId: string): Promise<void> {
    await this.runMutation(`follow:${userId}`, async () => {
      const result = await firstValueFrom(this.socialSvc.toggleFollow(userId));
      if (this.activeUserId !== userId) return;
      this.currentProfile.update(profile => profile ? {
        ...profile,
        isFollowedByMe: result.isFollowing,
        followersCount: result.followersCount,
      } : profile);
    });
  }

  // ── Follow list ───────────────────────────────────────────────────────────────

  async loadFollowList(userId: string, type: 'followers' | 'following', reset = true): Promise<void> {
    if (reset) {
      this.followListPage = 1;
      this.followListUsers.set([]);
      this.followListHasMore.set(false);
    }
    this.followListType.set(type);
    this.isLoadingFollowList.set(true);
    try {
      const res = type === 'followers'
        ? await firstValueFrom(this.socialSvc.getFollowers(userId, this.followListPage))
        : await firstValueFrom(this.socialSvc.getFollowing(userId, this.followListPage));
      this.followListUsers.update(existing => reset ? res.items : [...existing, ...res.items]);
      this.followListHasMore.set(res.hasMore);
      this.followListPage++;
    } catch {
      this.alerts.error('Failed to load ' + type + '.');
    } finally {
      this.isLoadingFollowList.set(false);
    }
  }

  async loadMoreFollowList(userId: string): Promise<void> {
    const type = this.followListType();
    if (!type || !this.followListHasMore()) return;
    await this.loadFollowList(userId, type, false);
  }

  closeFollowList(): void {
    this.followListType.set(null);
    this.followListUsers.set([]);
    this.followListHasMore.set(false);
    this.followListPage = 1;
  }

  // ── Public stats ──────────────────────────────────────────────────────────────

  async loadPublicStats(userId: string): Promise<void> {
    this.ensureProfileContext(userId);
    const request = this.startRequest('public-stats');
    this.publicStats.set(null);
    this.isLoadingPublicStats.set(true);
    this.publicStatsError.set(null);
    try {
      const stats = await firstValueFrom(this.statsSvc.getPublicStats(userId));
      if (this.isCurrentRequest('public-stats', request, userId)) this.publicStats.set(stats);
    } catch {
      if (this.isCurrentRequest('public-stats', request, userId)) this.publicStatsError.set('Could not load stats. Please try again.');
    } finally {
      if (this.isCurrentRequest('public-stats', request, userId)) this.isLoadingPublicStats.set(false);
    }
  }

  // ── Mutation helpers called by SocialContentFacade ────────────────────────────

  patchProfilePost(fn: (p: Post) => Post): void { this.profilePosts.update(posts => posts.map(fn)); }
  removeProfilePost(id: number): void { this.profilePosts.update(f => f.filter(p => p.id !== id)); }
  restoreProfilePosts(posts: Post[]): void { this.profilePosts.set(posts); }

  private ensureProfileContext(userId: string): void {
    if (this.activeUserId !== userId) this.resetProfileContext(userId);
  }

  private resetProfileContext(userId: string | null): void {
    this.activeUserId = userId;
    this.latestRequest.clear();
    this.currentProfile.set(null);
    this.profilePosts.set([]);
    this.profileWorkouts.set([]);
    this.profileMeals.set([]);
    this.hiddenProfileMeals.set([]);
    this.profileBlogs.set([]);
    this.archivedPosts.set([]);
    this.archivedWorkouts.set([]);
    this.archivedBlogs.set([]);
    this.publicStats.set(null);
    this.profileError.set(null);
    this.profilePostsError.set(null);
    this.profileWorkoutsError.set(null);
    this.profileMealsError.set(null);
    this.profileBlogsError.set(null);
    this.archivedPostsError.set(null);
    this.archivedWorkoutsError.set(null);
    this.archivedBlogsError.set(null);
    this.publicStatsError.set(null);
    this.isLoadingProfile.set(false);
    this.isLoadingProfilePosts.set(false);
    this.isLoadingProfileWorkouts.set(false);
    this.isLoadingProfileMeals.set(false);
    this.isLoadingProfileBlogs.set(false);
    this.isLoadingArchivedPosts.set(false);
    this.isLoadingArchivedWorkouts.set(false);
    this.isLoadingArchivedBlogs.set(false);
    this.isLoadingPublicStats.set(false);
    this.closeFollowList();
    this.pages.clear();
    this.profilePostsHasMore.set(false);
    this.profileWorkoutsHasMore.set(false);
    this.profileBlogsHasMore.set(false);
    this.archivedPostsHasMore.set(false);
    this.archivedWorkoutsHasMore.set(false);
    this.archivedBlogsHasMore.set(false);
  }

  private startRequest(resource: string): number {
    const request = ++this.requestSequence;
    this.latestRequest.set(resource, request);
    return request;
  }

  private isCurrentRequest(resource: string, request: number, userId: string): boolean {
    return this.activeUserId === userId && this.latestRequest.get(resource) === request;
  }

  private mergeUnique<T extends { id: number }>(current: T[], incoming: T[]): T[] {
    const ids = new Set(current.map(item => item.id));
    return [...current, ...incoming.filter(item => !ids.has(item.id))];
  }

  private async runMutation(key: string, action: () => Promise<void>): Promise<void> {
    if (this.pendingMutations().has(key)) return;
    this.pendingMutations.update(pending => new Set([...pending, key]));
    this.mutationError.set(null);
    try {
      await action();
    } catch (error) {
      this.mutationError.set('The action could not be completed. Please try again.');
      throw error;
    } finally {
      this.pendingMutations.update(pending => {
        const next = new Set(pending);
        next.delete(key);
        return next;
      });
    }
  }
}
