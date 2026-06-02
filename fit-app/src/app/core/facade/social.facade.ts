import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { StatsService } from '../../api/stats.service';
import { AlertService } from '../../shared/services/alert.service';
import {
  Post,
  Comment,
  UserSocialProfile,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  FollowToggleResponse,
  UserSearchResult,
  ProfileWorkout,
  ProfileBlog,
  CreateBlogRequest,
  UpdateBlogRequest,
  ArticleDetail,
  PaginatedResponse,
  SuggestedUser,
  PostFromWorkoutRequest,
  PostFromMealRequest,
  SharePostResponse,
} from '../models/social.model';
import { UserPublicStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class SocialFacade {
  private readonly socialSvc = inject(SocialService);
  private readonly statsSvc = inject(StatsService);
  private readonly alerts = inject(AlertService);

  // Public stats state (other profiles)
  publicStats = signal<UserPublicStats | null>(null);
  isLoadingPublicStats = signal(false);
  publicStatsError = signal<string | null>(null);

  // Feed state
  feed = signal<Post[]>([]);
  isLoadingFeed = signal(false);
  hasMoreFeed = signal(true);
  feedError = signal<string | null>(null);
  private feedPage = 1;

  // Discover state
  discoverPosts = signal<Post[]>([]);
  isLoadingDiscover = signal(false);
  discoverError = signal<string | null>(null);

  // Profile state
  currentProfile = signal<UserSocialProfile | null>(null);
  profilePosts = signal<Post[]>([]);
  isLoadingProfile = signal(false);
  profileError = signal<string | null>(null);

  // Search state
  searchResults = signal<UserSearchResult[]>([]);
  isSearching = signal(false);
  searchError = signal<string | null>(null);

  // ── Fix 7: Guided empty state ─────────────────────────────────────────────────

  /** Current user's own following count — used to decide if guided empty shows. */
  myFollowingCount = signal<number>(0);
  isLoadingFollowingCount = signal(false);

  /** Suggested users for the social feed guided empty state. */
  suggestedUsers = signal<SuggestedUser[]>([]);
  isLoadingSuggestions = signal(false);
  suggestionsError = signal<string | null>(null);

  // Profile sections state
  profileWorkouts = signal<ProfileWorkout[]>([]);
  profileBlogs = signal<ProfileBlog[]>([]);
  archivedPosts = signal<Post[]>([]);
  archivedWorkouts = signal<ProfileWorkout[]>([]);
  private profileSectionLoadingCount = signal(0);
  isLoadingProfileSections = computed(() => this.profileSectionLoadingCount() > 0);
  profileSectionsError = signal<string | null>(null);

  async loadFeed(reset = false): Promise<void> {
    if (reset) {
      this.feedPage = 1;
      this.feed.set([]);
      this.hasMoreFeed.set(true);
      this.feedError.set(null);
    }
    if (!this.hasMoreFeed()) return;
    this.isLoadingFeed.set(true);
    try {
      const res = await firstValueFrom(this.socialSvc.getFeed(this.feedPage));
      this.feed.update(f => [...f, ...res.items]);
      this.hasMoreFeed.set(res.hasMore);
      this.feedPage++;
    } catch (err: unknown) {
      this.feedError.set('Failed to load feed. Please try again.');
      const status = (err as { status?: number })?.status;
      if (status !== undefined && status >= 400 && status < 500) {
        this.hasMoreFeed.set(false);
      }
    } finally {
      this.isLoadingFeed.set(false);
    }
  }

  toggleLike(postId: number): void {
    // Capture snapshot before optimistic update so we can restore on failure
    const prevFeed = this.feed();
    const prevProfilePosts = this.profilePosts();
    const prevDiscoverPosts = this.discoverPosts();

    const applyLike = (p: Post) => p.id === postId
      ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
      : p;

    // Optimistic update on all three stores
    this.feed.update(posts => posts.map(applyLike));
    this.profilePosts.update(posts => posts.map(applyLike));
    this.discoverPosts.update(posts => posts.map(applyLike));

    firstValueFrom(this.socialSvc.toggleLike(postId)).catch(() => {
      // Revert from pre-mutation snapshot — avoids double-flip on concurrent actions
      this.feed.set(prevFeed);
      this.profilePosts.set(prevProfilePosts);
      this.discoverPosts.set(prevDiscoverPosts);
    });
  }

  async toggleFollow(userId: string): Promise<FollowToggleResponse> {
    return firstValueFrom(this.socialSvc.toggleFollow(userId));
  }

  async createPost(req: CreatePostRequest): Promise<void> {
    const post = await firstValueFrom(this.socialSvc.createPost(req));
    this.feed.update(f => [post, ...f]);
  }

  async updatePost(id: number, req: UpdatePostRequest): Promise<Post> {
    const updated = await firstValueFrom(this.socialSvc.updatePost(id, req));
    this.feed.update(f => f.map(p => p.id === id ? { ...p, ...updated } : p));
    this.discoverPosts.update(f => f.map(p => p.id === id ? { ...p, ...updated } : p));
    this.profilePosts.update(f => f.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  }

  async deletePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deletePost(id));
    this.feed.update(f => f.filter(p => p.id !== id));
    this.discoverPosts.update(f => f.filter(p => p.id !== id));
    this.profilePosts.update(f => f.filter(p => p.id !== id));
  }

  async loadDiscover(): Promise<void> {
    this.isLoadingDiscover.set(true);
    this.discoverError.set(null);
    try {
      const res = await firstValueFrom(this.socialSvc.getDiscover());
      this.discoverPosts.set(res.items);
    } catch {
      this.discoverError.set('Failed to load discover. Please try again.');
    } finally {
      this.isLoadingDiscover.set(false);
    }
  }

  async searchUsers(q: string): Promise<void> {
    if (!q.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    this.searchError.set(null);
    try {
      const results = await firstValueFrom(this.socialSvc.searchUsers(q));
      this.searchResults.set(results);
    } catch {
      this.searchError.set('Search failed. Please try again.');
    } finally {
      this.isSearching.set(false);
    }
  }

  clearSearch(): void {
    this.searchResults.set([]);
    this.searchError.set(null);
  }

  async loadProfileWorkouts(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getProfileWorkouts(userId));
      this.profileWorkouts.set(res.items);
    } catch {
      this.profileSectionsError.set('Failed to load workouts.');
    } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async loadProfileBlogs(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getProfileBlogs(userId));
      this.profileBlogs.set(res.items);
    } catch {
      this.profileSectionsError.set('Failed to load articles.');
    } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async loadArchivedPosts(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getArchivedPosts(userId));
      this.archivedPosts.set(res.items);
    } catch {
      this.profileSectionsError.set('Failed to load archived posts.');
    } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async archivePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archivePost(id));
    this.feed.update(f => f.filter(p => p.id !== id));
    this.profilePosts.update(f => f.filter(p => p.id !== id));
  }

  async unarchivePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archivePost(id));
    this.archivedPosts.update(f => f.filter(p => p.id !== id));
  }

  async loadArchivedWorkouts(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getArchivedWorkouts(userId));
      this.archivedWorkouts.set(res.items);
    } catch {
      this.profileSectionsError.set('Failed to load archived workouts.');
    } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async archiveWorkout(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archiveWorkout(id));
    this.profileWorkouts.update(f => f.filter(w => w.id !== id));
    this.archivedWorkouts.update(f => f.filter(w => w.id !== id));
  }

  async deleteWorkout(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deleteWorkout(id));
    this.profileWorkouts.update(f => f.filter(w => w.id !== id));
  }

  async archiveBlog(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archiveBlog(id));
    this.profileBlogs.update(f => f.filter(b => b.id !== id));
  }

  async deleteBlog(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deleteBlog(id));
    this.profileBlogs.update(f => f.filter(b => b.id !== id));
  }

  async createBlog(req: CreateBlogRequest): Promise<void> {
    const blog = await firstValueFrom(this.socialSvc.createBlog(req));
    this.profileBlogs.update(f => [blog, ...f]);
  }

  async updateBlogPost(id: number, req: UpdateBlogRequest): Promise<void> {
    const updated = await firstValueFrom(this.socialSvc.updateBlogPost(id, req));
    this.profileBlogs.update(f => f.map(b => b.id === id ? updated : b));
  }

  async updateBio(bio: string | null): Promise<void> {
    await firstValueFrom(this.socialSvc.updateBio(bio));
    this.currentProfile.update(p => p ? { ...p, bio: bio ?? undefined } : p);
  }

  async loadProfile(userId: string): Promise<void> {
    this.isLoadingProfile.set(true);
    this.profileError.set(null);
    try {
      const [profile, posts] = await Promise.all([
        firstValueFrom(this.socialSvc.getProfile(userId)),
        firstValueFrom(this.socialSvc.getProfilePosts(userId))
      ]);
      this.currentProfile.set(profile);
      this.profilePosts.set(posts.items);
    } catch {
      this.profileError.set('Failed to load profile. Please try again.');
    } finally {
      this.isLoadingProfile.set(false);
    }
  }

  async getPost(id: number): Promise<Post> {
    return firstValueFrom(this.socialSvc.getPost(id));
  }

  async getArticle(id: number): Promise<ArticleDetail> {
    return firstValueFrom(this.socialSvc.getArticle(id));
  }

  async getComments(postId: number, page = 1, pageSize = 20): Promise<PaginatedResponse<Comment>> {
    return firstValueFrom(this.socialSvc.getComments(postId, page, pageSize));
  }

  async addComment(postId: number, req: CreateCommentRequest): Promise<Comment> {
    return firstValueFrom(this.socialSvc.addComment(postId, req));
  }

  async deleteComment(postId: number, commentId: number): Promise<void> {
    return firstValueFrom(this.socialSvc.deleteComment(postId, commentId));
  }

  // ── Fix 7: Guided empty state methods ─────────────────────────────────────────

  /**
   * Loads the current user's following count from the dedicated lightweight endpoint.
   * Used by SocialFeedComponent to decide whether to show the guided empty state.
   * Silently fails — defaults to 0, which shows the guided state (safe fallback).
   */
  async loadMyFollowingCount(): Promise<void> {
    this.isLoadingFollowingCount.set(true);
    try {
      const result = await firstValueFrom(this.socialSvc.getMyFollowingCount());
      this.myFollowingCount.set(result.count);
    } catch {
      // silent — 0 is the safe default (shows guided state)
    } finally {
      this.isLoadingFollowingCount.set(false);
    }
  }

  /** Increments myFollowingCount after a successful follow from the guided state. */
  incrementMyFollowingCount(): void {
    this.myFollowingCount.update(n => n + 1);
  }

  /**
   * Loads up to `limit` (max 5) suggested users for the social-feed guided empty.
   * Uses GET /api/social/discover/suggested.
   */
  async loadSuggestedUsers(limit = 5): Promise<void> {
    this.isLoadingSuggestions.set(true);
    this.suggestionsError.set(null);
    try {
      const users = await firstValueFrom(this.socialSvc.getSuggestedUsers(limit));
      this.suggestedUsers.set(users);
    } catch {
      this.suggestionsError.set("Couldn't load suggestions. Please try again.");
    } finally {
      this.isLoadingSuggestions.set(false);
    }
  }

  // ── Fix 2 — Share to beSocial ──────────────────────────────────────────────

  /**
   * Creates a social post from a completed workout session.
   * PRIVACY: caption is the only user-provided field — no health metrics are sent.
   */
  async shareWorkout(sessionId: number, caption?: string): Promise<SharePostResponse | null> {
    try {
      const req: PostFromWorkoutRequest | undefined = caption ? { caption } : undefined;
      return await firstValueFrom(this.socialSvc.shareWorkout(sessionId, req));
    } catch {
      this.alerts.error('Failed to share workout. Please try again.');
      return null;
    }
  }

  /**
   * Creates a social post from a logged meal entry.
   * PRIVACY: caption is the only user-provided field — no macro or calorie data is sent.
   */
  async shareMeal(mealId: number, caption?: string): Promise<SharePostResponse | null> {
    try {
      const req: PostFromMealRequest | undefined = caption ? { caption } : undefined;
      return await firstValueFrom(this.socialSvc.shareMeal(mealId, req));
    } catch {
      this.alerts.error('Failed to share meal. Please try again.');
      return null;
    }
  }

  async loadPublicStats(userId: string): Promise<void> {
    this.publicStats.set(null);
    this.isLoadingPublicStats.set(true);
    this.publicStatsError.set(null);
    try {
      const stats = await firstValueFrom(this.statsSvc.getPublicStats(userId));
      this.publicStats.set(stats);
    } catch {
      this.publicStatsError.set('Could not load stats. Please try again.');
    } finally {
      this.isLoadingPublicStats.set(false);
    }
  }
}
