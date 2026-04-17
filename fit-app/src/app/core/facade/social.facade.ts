import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { StatsService } from '../../api/stats.service';
import {
  Post,
  UserSocialProfile,
  CreatePostRequest,
  UpdatePostRequest,
  FollowToggleResponse,
  UserSearchResult,
  ProfileWorkout,
  ProfileBlog,
  CreateBlogRequest,
  UpdateBlogRequest,
  ArticleDetail
} from '../models/social.model';
import { UserPublicStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class SocialFacade {
  private readonly socialSvc = inject(SocialService);
  private readonly statsSvc = inject(StatsService);

  // Public stats state (other profiles)
  private readonly _publicStats = signal<UserPublicStats | null>(null);
  readonly publicStats = this._publicStats.asReadonly();
  private readonly _isLoadingPublicStats = signal(false);
  readonly isLoadingPublicStats = this._isLoadingPublicStats.asReadonly();
  private readonly _publicStatsError = signal<string | null>(null);
  readonly publicStatsError = this._publicStatsError.asReadonly();

  // Feed state
  private readonly _feed = signal<Post[]>([]);
  readonly feed = this._feed.asReadonly();
  private readonly _isLoadingFeed = signal(false);
  readonly isLoadingFeed = this._isLoadingFeed.asReadonly();
  private readonly _hasMoreFeed = signal(true);
  readonly hasMoreFeed = this._hasMoreFeed.asReadonly();
  private readonly _feedError = signal<string | null>(null);
  readonly feedError = this._feedError.asReadonly();
  private feedPage = 1;

  // Discover state
  private readonly _discoverPosts = signal<Post[]>([]);
  readonly discoverPosts = this._discoverPosts.asReadonly();
  private readonly _isLoadingDiscover = signal(false);
  readonly isLoadingDiscover = this._isLoadingDiscover.asReadonly();
  private readonly _discoverError = signal<string | null>(null);
  readonly discoverError = this._discoverError.asReadonly();

  // Profile state
  private readonly _currentProfile = signal<UserSocialProfile | null>(null);
  readonly currentProfile = this._currentProfile.asReadonly();
  private readonly _profilePosts = signal<Post[]>([]);
  readonly profilePosts = this._profilePosts.asReadonly();
  private readonly _isLoadingProfile = signal(false);
  readonly isLoadingProfile = this._isLoadingProfile.asReadonly();
  private readonly _profileError = signal<string | null>(null);
  readonly profileError = this._profileError.asReadonly();

  // Search state
  private readonly _searchResults = signal<UserSearchResult[]>([]);
  readonly searchResults = this._searchResults.asReadonly();
  private readonly _isSearching = signal(false);
  readonly isSearching = this._isSearching.asReadonly();
  private readonly _searchError = signal<string | null>(null);
  readonly searchError = this._searchError.asReadonly();

  // Profile sections state
  private readonly _profileWorkouts = signal<ProfileWorkout[]>([]);
  readonly profileWorkouts = this._profileWorkouts.asReadonly();
  private readonly _profileBlogs = signal<ProfileBlog[]>([]);
  readonly profileBlogs = this._profileBlogs.asReadonly();
  private readonly _archivedPosts = signal<Post[]>([]);
  readonly archivedPosts = this._archivedPosts.asReadonly();
  private readonly profileSectionLoadingCount = signal(0);
  readonly isLoadingProfileSections = computed(() => this.profileSectionLoadingCount() > 0);

  async loadFeed(reset = false): Promise<void> {
    if (reset) {
      this.feedPage = 1;
      this._feed.set([]);
      this._hasMoreFeed.set(true);
      this._feedError.set(null);
    }
    if (!this.hasMoreFeed()) return;
    this._isLoadingFeed.set(true);
    try {
      const res = await firstValueFrom(this.socialSvc.getFeed(this.feedPage));
      this._feed.update(f => [...f, ...res.items]);
      this._hasMoreFeed.set(res.hasMore);
      this.feedPage++;
    } catch (err: unknown) {
      this._feedError.set('Failed to load feed. Please try again.');
      const status = (err as { status?: number })?.status;
      if (status !== undefined && status >= 400 && status < 500) {
        this._hasMoreFeed.set(false);
      }
    } finally {
      this._isLoadingFeed.set(false);
    }
  }

  toggleLike(postId: number): void {
    // Capture snapshot before optimistic update so we can restore on failure
    const prevFeed = this.feed();
    const prevProfilePosts = this.profilePosts();

    // Optimistic update
    this._feed.update(posts => posts.map(p =>
      p.id === postId
        ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    this._profilePosts.update(posts => posts.map(p =>
      p.id === postId
        ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    firstValueFrom(this.socialSvc.toggleLike(postId)).catch(() => {
      // Revert from pre-mutation snapshot — avoids double-flip on concurrent actions
      this._feed.set(prevFeed);
      this._profilePosts.set(prevProfilePosts);
    });
  }

  async toggleFollow(userId: string): Promise<FollowToggleResponse> {
    return firstValueFrom(this.socialSvc.toggleFollow(userId));
  }

  async createPost(req: CreatePostRequest): Promise<void> {
    const post = await firstValueFrom(this.socialSvc.createPost(req));
    this._feed.update(f => [post, ...f]);
  }

  async updatePost(id: number, req: UpdatePostRequest): Promise<Post> {
    const updated = await firstValueFrom(this.socialSvc.updatePost(id, req));
    this._feed.update(f => f.map(p => p.id === id ? { ...p, ...updated } : p));
    this._discoverPosts.update(f => f.map(p => p.id === id ? { ...p, ...updated } : p));
    this._profilePosts.update(f => f.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  }

  async deletePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deletePost(id));
    this._feed.update(f => f.filter(p => p.id !== id));
    this._discoverPosts.update(f => f.filter(p => p.id !== id));
    this._profilePosts.update(f => f.filter(p => p.id !== id));
  }

  async loadDiscover(): Promise<void> {
    this._isLoadingDiscover.set(true);
    this._discoverError.set(null);
    try {
      const res = await firstValueFrom(this.socialSvc.getDiscover());
      this._discoverPosts.set(res.items);
    } catch {
      this._discoverError.set('Failed to load discover. Please try again.');
    } finally {
      this._isLoadingDiscover.set(false);
    }
  }

  async searchUsers(q: string): Promise<void> {
    if (!q.trim()) {
      this._searchResults.set([]);
      return;
    }
    this._isSearching.set(true);
    this._searchError.set(null);
    try {
      const results = await firstValueFrom(this.socialSvc.searchUsers(q));
      this._searchResults.set(results);
    } catch {
      this._searchError.set('Search failed. Please try again.');
    } finally {
      this._isSearching.set(false);
    }
  }

  clearSearch(): void {
    this._searchResults.set([]);
    this._searchError.set(null);
  }

  async loadProfileWorkouts(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getProfileWorkouts(userId));
      this._profileWorkouts.set(res.items);
    } catch { /* silently ignore */ } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async loadProfileBlogs(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getProfileBlogs(userId));
      this._profileBlogs.set(res.items);
    } catch { /* silently ignore */ } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async loadArchivedPosts(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getArchivedPosts(userId));
      this._archivedPosts.set(res.items);
    } catch { /* silently ignore */ } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async archivePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archivePost(id));
    this._feed.update(f => f.filter(p => p.id !== id));
    this._profilePosts.update(f => f.filter(p => p.id !== id));
  }

  async unarchivePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archivePost(id));
    this._archivedPosts.update(f => f.filter(p => p.id !== id));
  }

  async archiveWorkout(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archiveWorkout(id));
    this._profileWorkouts.update(f => f.filter(w => w.id !== id));
  }

  async deleteWorkout(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deleteWorkout(id));
    this._profileWorkouts.update(f => f.filter(w => w.id !== id));
  }

  async archiveBlog(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archiveBlog(id));
    this._profileBlogs.update(f => f.filter(b => b.id !== id));
  }

  async deleteBlog(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deleteBlog(id));
    this._profileBlogs.update(f => f.filter(b => b.id !== id));
  }

  async createBlog(req: CreateBlogRequest): Promise<void> {
    const blog = await firstValueFrom(this.socialSvc.createBlog(req));
    this._profileBlogs.update(f => [blog, ...f]);
  }

  async updateBlogPost(id: number, req: UpdateBlogRequest): Promise<void> {
    const updated = await firstValueFrom(this.socialSvc.updateBlogPost(id, req));
    this._profileBlogs.update(f => f.map(b => b.id === id ? updated : b));
  }

  async updateBio(bio: string | null): Promise<void> {
    await firstValueFrom(this.socialSvc.updateBio(bio));
    this._currentProfile.update(p => p ? { ...p, bio: bio ?? undefined } : p);
  }

  async loadProfile(userId: string): Promise<void> {
    this._isLoadingProfile.set(true);
    this._profileError.set(null);
    try {
      const [profile, posts] = await Promise.all([
        firstValueFrom(this.socialSvc.getProfile(userId)),
        firstValueFrom(this.socialSvc.getProfilePosts(userId))
      ]);
      this._currentProfile.set(profile);
      this._profilePosts.set(posts.items);
    } catch {
      this._profileError.set('Failed to load profile. Please try again.');
    } finally {
      this._isLoadingProfile.set(false);
    }
  }

  async getArticle(id: number): Promise<ArticleDetail> {
    return firstValueFrom(this.socialSvc.getArticle(id));
  }

  async loadPublicStats(userId: string): Promise<void> {
    this._publicStats.set(null);
    this._isLoadingPublicStats.set(true);
    this._publicStatsError.set(null);
    try {
      const stats = await firstValueFrom(this.statsSvc.getPublicStats(userId));
      this._publicStats.set(stats);
    } catch {
      this._publicStatsError.set('Could not load stats. Please try again.');
    } finally {
      this._isLoadingPublicStats.set(false);
    }
  }
}
