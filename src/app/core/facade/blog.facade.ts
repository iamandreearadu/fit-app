import { computed, inject, Injectable, signal, WritableSignal } from "@angular/core";
import { BlogService } from "../services/blog.service";
import { BlogPost } from "../models/blog.model";
import { toObservable } from '@angular/core/rxjs-interop';


@Injectable({
    providedIn: 'root'
})
export class BlogFacade {

  private readonly blogSvc = inject(BlogService);

  // state signals
    private readonly _posts = signal<BlogPost[]>([]);
    private readonly _selectedPost = signal<BlogPost | null>(null);
    private readonly _loading = signal(false);


  // getters 
    get posts() {
    return this._posts();
}
    get selectedPost() { 
    return this._selectedPost();
 }

  // observabile 
  posts$ = toObservable(this._posts);
  selectedPost$ = toObservable(this._selectedPost) ;


   categories = computed(() => {
    const set = new Set<string>();
    this._posts().forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  });


  constructor() {}


    public async loadPosts(): Promise<void> {
    this._loading.set(true);
    try {
      const posts = await this.blogSvc.listPosts();
      this._posts.set(posts);

    } finally {
      this._loading.set(false);
    }
  }

 public async getPost(docId?: string | null): Promise<void> {
    if (!docId) {
      this._selectedPost.set(null);
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
          await this.loadPosts();
          this._selectedPost.set(updated);
        }
      } else {
        const created = await this.blogSvc.addPost(editModel as Partial<BlogPost>);
        if (created) {
          await this.loadPosts();
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
         await this.loadPosts();
      }
    } finally {
      this._loading.set(false);
    }
  }
}

