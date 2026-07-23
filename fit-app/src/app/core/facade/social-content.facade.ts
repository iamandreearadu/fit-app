import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { AlertService } from '../../shared/services/alert.service';
import {
  Post,
  Comment,
  ArticleDetail,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  FollowToggleResponse,
  UserSearchResult,
  PaginatedResponse,
  PostFromWorkoutRequest,
  PostFromMealRequest,
  SharePostResponse,
} from '../models/social.model';
import { SocialFeedFacade } from './social-feed.facade';
import { SocialProfileFacade } from './social-profile.facade';

@Injectable({ providedIn: 'root' })
export class SocialContentFacade {
  private readonly socialSvc = inject(SocialService);
  private readonly alerts = inject(AlertService);
  private readonly feedFacade = inject(SocialFeedFacade);
  private readonly profileFacade = inject(SocialProfileFacade);

  // ── Search state ──────────────────────────────────────────────────────────────
  private readonly _searchResults = signal<UserSearchResult[]>([]);
  readonly searchResults = this._searchResults.asReadonly();
  readonly isSearching = signal(false);
  readonly searchError = signal<string | null>(null);

  // ── Like (optimistic, fan-out across all stores) ──────────────────────────────

  toggleLike(postId: number): void {
    const prevFeed = this.feedFacade.feed();
    const prevProfilePosts = this.profileFacade.profilePosts();
    const prevDiscoverPosts = this.feedFacade.discoverPosts();

    const applyLike = (p: Post): Post => p.id === postId
      ? { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
      : p;

    this.feedFacade.patchFeedPost(applyLike);
    this.profileFacade.patchProfilePost(applyLike);
    this.feedFacade.patchDiscoverPost(applyLike);

    firstValueFrom(this.socialSvc.toggleLike(postId)).catch(() => {
      this.feedFacade.restoreFeed(prevFeed);
      this.profileFacade.restoreProfilePosts(prevProfilePosts);
      this.feedFacade.restoreDiscoverPosts(prevDiscoverPosts);
    });
  }

  syncSavedState(postId: number, isSaved: boolean): void {
    const apply = (post: Post): Post => post.id === postId
      ? { ...post, isSavedByMe: isSaved }
      : post;
    this.feedFacade.patchFeedPost(apply);
    this.feedFacade.patchDiscoverPost(apply);
    this.profileFacade.patchProfilePost(apply);
  }

  // ── Post CRUD ─────────────────────────────────────────────────────────────────

  async createPost(req: CreatePostRequest): Promise<void> {
    const post = await firstValueFrom(this.socialSvc.createPost(req));
    this.feedFacade.feed.update(f => [post, ...f]);
  }

  async updatePost(id: number, req: UpdatePostRequest): Promise<Post> {
    const updated = await firstValueFrom(this.socialSvc.updatePost(id, req));
    this.feedFacade.patchFeedPost(p => p.id === id ? { ...p, ...updated } : p);
    this.feedFacade.patchDiscoverPost(p => p.id === id ? { ...p, ...updated } : p);
    this.profileFacade.patchProfilePost(p => p.id === id ? { ...p, ...updated } : p);
    return updated;
  }

  async deletePost(id: number): Promise<void> {
    await firstValueFrom(this.socialSvc.deletePost(id));
    this.feedFacade.removeFeedPost(id);
    this.feedFacade.removeDiscoverPost(id);
    this.profileFacade.removeProfilePost(id);
  }

  // ── Single post / article ─────────────────────────────────────────────────────

  async getPost(id: number): Promise<Post> {
    return firstValueFrom(this.socialSvc.getPost(id));
  }

  async getArticle(id: number): Promise<ArticleDetail> {
    return firstValueFrom(this.socialSvc.getArticle(id));
  }

  // ── Comments ──────────────────────────────────────────────────────────────────

  async getComments(postId: number, page = 1, pageSize = 20): Promise<PaginatedResponse<Comment>> {
    return firstValueFrom(this.socialSvc.getComments(postId, page, pageSize));
  }

  async addComment(postId: number, req: CreateCommentRequest): Promise<Comment> {
    return firstValueFrom(this.socialSvc.addComment(postId, req));
  }

  async deleteComment(postId: number, commentId: number): Promise<void> {
    return firstValueFrom(this.socialSvc.deleteComment(postId, commentId));
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  async searchUsers(q: string): Promise<void> {
    if (!q.trim()) {
      this._searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    this.searchError.set(null);
    try {
      const results = await firstValueFrom(this.socialSvc.searchUsers(q));
      this._searchResults.set(results);
    } catch {
      this.searchError.set('Search failed. Please try again.');
    } finally {
      this.isSearching.set(false);
    }
  }

  clearSearch(): void {
    this._searchResults.set([]);
    this.searchError.set(null);
  }

  // ── Follow ────────────────────────────────────────────────────────────────────

  async toggleFollow(userId: string): Promise<FollowToggleResponse> {
    return firstValueFrom(this.socialSvc.toggleFollow(userId));
  }

  // ── Share ─────────────────────────────────────────────────────────────────────

  async shareWorkout(sessionId: number, caption?: string): Promise<SharePostResponse | null> {
    try {
      const req: PostFromWorkoutRequest | undefined = caption ? { caption } : undefined;
      return await firstValueFrom(this.socialSvc.shareWorkout(sessionId, req));
    } catch {
      this.alerts.error('Failed to share workout. Please try again.');
      return null;
    }
  }

  async shareMeal(mealId: number, caption?: string): Promise<SharePostResponse | null> {
    try {
      const req: PostFromMealRequest | undefined = caption ? { caption } : undefined;
      return await firstValueFrom(this.socialSvc.shareMeal(mealId, req));
    } catch {
      this.alerts.error('Failed to share meal. Please try again.');
      return null;
    }
  }
}
