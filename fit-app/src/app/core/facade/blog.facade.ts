import { computed, inject, Injectable, signal, WritableSignal } from "@angular/core";
import { BlogService } from "../../api/blog.service";
import { BlogPost } from "../models/blog.model";


@Injectable({
    providedIn: 'root'
})
export class BlogFacade {

  private blogSvc = inject(BlogService);

  // state signals
    private readonly _posts = signal<BlogPost[]>([]);
  private readonly _selectedPost = signal<BlogPost | null>(null);
  private readonly _loading = signal(false);
  private postsLoaded = false;
  private postsRequest: Promise<void> | null = null;


  // getters 
    get posts() {
    return this._posts();
}
    get selectedPost() { 
    return this._selectedPost();
 }

  get loading() {
    return this._loading();
  }

  categories = computed(() => {
    const set = new Set<string>();
    this._posts().forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  });

  public async loadPosts(force = false): Promise<void> {
    if (!force && this.postsLoaded) return;
    if (!force && this.postsRequest) return this.postsRequest;

    this._loading.set(true);
    this.postsRequest = (async () => {
      try {
        const posts = await this.blogSvc.listPosts();
        this._posts.set(posts);
        // Do not cache an empty response: the service also returns [] after a
        // network failure, so the next visit must be allowed to retry.
        this.postsLoaded = posts.length > 0;
      } finally {
        this._loading.set(false);
        this.postsRequest = null;
      }
    })();

    return this.postsRequest;
  }

 public async getPost(docId?: string | null): Promise<void> {
    if (!docId) {
      this._selectedPost.set(null);
      return;
    }
    const cachedPost = this._posts().find(post => post.uid === docId);
    if (cachedPost) {
      this._selectedPost.set(cachedPost);
      return;
    }

    this._loading.set(true);
    try {
      const p = await this.blogSvc.getPost(docId);
      this._selectedPost.set(p);
    } finally {
      this._loading.set(false);
    }
  }

  async createOrUpdatePost(editModel: Partial<BlogPost>): Promise<void> {
    if (!editModel) return;
    this._loading.set(true);
    try {
      if (editModel.id) {
        const updated = await this.blogSvc.updatePostByNumericId(
          Number(editModel.id),
          editModel
        );
        if (updated) {
          await this.loadPosts(true);
          this._selectedPost.set(updated);
        }
      } else {
        const created = await this.blogSvc.addPost(editModel as Partial<BlogPost>);
        if (created) {
          await this.loadPosts(true);
          this._selectedPost.set(created);
        }
      }
    } finally {
      this._loading.set(false);
    }
  }

   async deletePost(uid?: string): Promise<void> {
    if (!uid) return;
    this._loading.set(true);
    try {
      const success = await this.blogSvc.deletePostByUid(uid);
      if (success) {
        this._selectedPost.set(null);
         await this.loadPosts(true);
      }
    } finally {
      this._loading.set(false);
    }
  }
}

