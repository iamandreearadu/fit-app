import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../api/social.service';
import { Post } from '../models/social.model';

@Injectable()
export class SavedPostsFacade {
  private readonly api = inject(SocialService);
  readonly posts = signal<Post[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  private page = 0;
  private request = 0;

  async load(): Promise<void> { this.page = 0; this.posts.set([]); await this.fetch(false); }
  async loadMore(): Promise<void> { if (!this.hasMore() || this.loadingMore()) return; await this.fetch(true); }
  remove(postId: number): void { this.posts.update(items => items.filter(p => p.id !== postId)); }
  private async fetch(append: boolean): Promise<void> {
    const request = ++this.request; append ? this.loadingMore.set(true) : this.loading.set(true); this.error.set(null);
    try { const next = this.page + 1; const res = await firstValueFrom(this.api.getSavedPosts(next)); if (request !== this.request) return; this.page = next; this.posts.update(items => append ? [...items, ...res.items.filter(p => !items.some(x => x.id === p.id))] : res.items); this.hasMore.set(res.hasMore); }
    catch { if (request === this.request) this.error.set('Could not load saved posts.'); }
    finally { if (request === this.request) { this.loading.set(false); this.loadingMore.set(false); } }
  }
}
