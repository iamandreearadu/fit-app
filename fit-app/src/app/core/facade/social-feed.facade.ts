import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { Post, SuggestedUser } from '../models/social.model';

@Injectable({ providedIn: 'root' })
export class SocialFeedFacade {
  private readonly socialSvc = inject(SocialService);

  // ── Feed ─────────────────────────────────────────────────────────────────────
  readonly feed = signal<Post[]>([]);
  readonly isLoadingFeed = signal(false);
  readonly hasMoreFeed = signal(true);
  readonly feedError = signal<string | null>(null);
  private feedPage = 1;

  // ── Discover ─────────────────────────────────────────────────────────────────
  private readonly _discoverPosts = signal<Post[]>([]);
  readonly discoverPosts = this._discoverPosts.asReadonly();
  readonly isLoadingDiscover = signal(false);
  readonly discoverError = signal<string | null>(null);
  private readonly _discoverPage = signal(1);
  private readonly _discoverHasMore = signal(true);
  readonly discoverHasMore = this._discoverHasMore.asReadonly();

  // ── Guided empty state ────────────────────────────────────────────────────────
  readonly myFollowingCount = signal<number>(0);
  readonly isLoadingFollowingCount = signal(false);
  private readonly _suggestedUsers = signal<SuggestedUser[]>([]);
  private readonly _isLoadingSuggestions = signal(false);
  readonly suggestedUsers = this._suggestedUsers.asReadonly();
  readonly isLoadingSuggestions = this._isLoadingSuggestions.asReadonly();
  readonly suggestionsError = signal<string | null>(null);

  // ── Feed methods ──────────────────────────────────────────────────────────────

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

  // ── Discover methods ──────────────────────────────────────────────────────────

  async loadDiscover(page = 1): Promise<void> {
    if (page === 1) {
      this._discoverPosts.set([]);
      this._discoverHasMore.set(true);
      this.discoverError.set(null);
    }
    if (!this._discoverHasMore()) return;
    this.isLoadingDiscover.set(true);
    try {
      const res = await firstValueFrom(this.socialSvc.getDiscover(page, 12));
      if (page === 1) {
        this._discoverPosts.set(res.items);
      } else {
        this._discoverPosts.update(existing => [...existing, ...res.items]);
      }
      this._discoverHasMore.set(res.items.length === 12);
      this._discoverPage.set(page);
    } catch {
      this.discoverError.set('Failed to load discover. Please try again.');
    } finally {
      this.isLoadingDiscover.set(false);
    }
  }

  // ── Guided empty state methods ─────────────────────────────────────────────────

  async loadMyFollowingCount(): Promise<void> {
    this.isLoadingFollowingCount.set(true);
    try {
      const result = await firstValueFrom(this.socialSvc.getMyFollowingCount());
      this.myFollowingCount.set(result.count);
    } catch {
      // silent — 0 is the safe default
    } finally {
      this.isLoadingFollowingCount.set(false);
    }
  }

  incrementMyFollowingCount(): void {
    this.myFollowingCount.update(n => n + 1);
  }

  async loadSuggestedUsers(limit = 5): Promise<void> {
    this._isLoadingSuggestions.set(true);
    this.suggestionsError.set(null);
    try {
      const users = await firstValueFrom(this.socialSvc.getSuggestedUsers(limit));
      this._suggestedUsers.set(users);
    } catch {
      this.suggestionsError.set("Couldn't load suggestions. Please try again.");
    } finally {
      this._isLoadingSuggestions.set(false);
    }
  }

  // ── Mutation helpers called by SocialContentFacade ────────────────────────────

  patchFeedPost(fn: (p: Post) => Post): void { this.feed.update(posts => posts.map(fn)); }
  removeFeedPost(id: number): void { this.feed.update(f => f.filter(p => p.id !== id)); }
  restoreFeed(posts: Post[]): void { this.feed.set(posts); }

  patchDiscoverPost(fn: (p: Post) => Post): void { this._discoverPosts.update(posts => posts.map(fn)); }
  removeDiscoverPost(id: number): void { this._discoverPosts.update(f => f.filter(p => p.id !== id)); }
  restoreDiscoverPosts(posts: Post[]): void { this._discoverPosts.set(posts); }
}
