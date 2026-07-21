import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { StatsService } from '../../api/stats.service';
import { AlertService } from '../../shared/services/alert.service';
import {
  Post,
  UserSocialProfile,
  ProfileWorkout,
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

  // ── Profile sections ──────────────────────────────────────────────────────────
  readonly profileWorkouts = signal<ProfileWorkout[]>([]);
  readonly profileBlogs = signal<ProfileBlog[]>([]);
  readonly archivedPosts = signal<Post[]>([]);
  readonly archivedWorkouts = signal<ProfileWorkout[]>([]);
  private readonly profileSectionLoadingCount = signal(0);
  readonly isLoadingProfileSections = computed(() => this.profileSectionLoadingCount() > 0);
  readonly profileSectionsError = signal<string | null>(null);

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
    this.isLoadingProfile.set(true);
    this.profileError.set(null);
    try {
      const [profile, posts] = await Promise.all([
        firstValueFrom(this.socialSvc.getProfile(userId)),
        firstValueFrom(this.socialSvc.getProfilePosts(userId)),
      ]);
      this.currentProfile.set(profile);
      this.profilePosts.set(posts.items);
    } catch {
      this.profileError.set('Failed to load profile. Please try again.');
    } finally {
      this.isLoadingProfile.set(false);
    }
  }

  async updateBio(bio: string | null): Promise<void> {
    await firstValueFrom(this.socialSvc.updateBio(bio));
    this.currentProfile.update(p => p ? { ...p, bio: bio ?? undefined } : p);
  }

  // ── Profile sections ──────────────────────────────────────────────────────────

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

  async archivePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archivePost(id));
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

  async unarchiveWorkout(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.archiveWorkout(id));
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

  // ── Mutation helpers called by SocialContentFacade ────────────────────────────

  patchProfilePost(fn: (p: Post) => Post): void { this.profilePosts.update(posts => posts.map(fn)); }
  removeProfilePost(id: number): void { this.profilePosts.update(f => f.filter(p => p.id !== id)); }
  restoreProfilePosts(posts: Post[]): void { this.profilePosts.set(posts); }
}
