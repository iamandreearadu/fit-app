import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
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

@Injectable({ providedIn: 'root' })
export class SocialFacade {
  private readonly socialSvc = inject(SocialService);

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

  // Profile sections state
  profileWorkouts = signal<ProfileWorkout[]>([]);
  profileBlogs = signal<ProfileBlog[]>([]);
  archivedPosts = signal<Post[]>([]);
  private profileSectionLoadingCount = signal(0);
  isLoadingProfileSections = computed(() => this.profileSectionLoadingCount() > 0);

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

    // Optimistic update
    this.feed.update(posts => posts.map(p =>
      p.id === postId
        ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    this.profilePosts.update(posts => posts.map(p =>
      p.id === postId
        ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    firstValueFrom(this.socialSvc.toggleLike(postId)).catch(() => {
      // Revert from pre-mutation snapshot — avoids double-flip on concurrent actions
      this.feed.set(prevFeed);
      this.profilePosts.set(prevProfilePosts);
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
    } catch { /* silently ignore */ } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async loadProfileBlogs(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getProfileBlogs(userId));
      this.profileBlogs.set(res.items);
    } catch { /* silently ignore */ } finally {
      this.profileSectionLoadingCount.update(n => Math.max(0, n - 1));
    }
  }

  async loadArchivedPosts(userId: string): Promise<void> {
    this.profileSectionLoadingCount.update(n => n + 1);
    try {
      const res = await firstValueFrom(this.socialSvc.getArchivedPosts(userId));
      this.archivedPosts.set(res.items);
    } catch { /* silently ignore */ } finally {
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

  async archiveWorkout(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archiveWorkout(id));
    this.profileWorkouts.update(f => f.filter(w => w.id !== id));
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

  async getArticle(id: number): Promise<ArticleDetail> {
    return firstValueFrom(this.socialSvc.getArticle(id));
  }
}
