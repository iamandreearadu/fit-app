import { Component, Input, OnInit, inject } from '@angular/core';
import { BlogPost } from '../../../core/models/blog.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../../core/services/blog,service';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-blog-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-content.component.html',
  styleUrl: './blog-content.component.css'
})
export class BlogContentComponent {
  @Input() post?: BlogPost | null;

  private blogSvc = inject(BlogService);
  private auth = inject<Auth>(Auth);
  private route = inject(ActivatedRoute);

  loading = false;
  // list + filtering state
  posts: BlogPost[] = [];
  filtered: BlogPost[] = [];
  searchTerm = '';
  categories: string[] = [];
  selectedCategory = 'all';

  // inline create / edit form model
  editing = false;
  editModel: Partial<BlogPost> = {};
  // overlay / permission
  showCreateOverlay = false;
  isOwner = false;

  async ngOnInit(): Promise<void> {
    // if no post supplied via input, try to load by route id
    if (!this.post) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.loading = true;
        try {
          const p = await this.blogSvc.getPost(id);
          this.post = p;
        } finally {
          this.loading = false;
        }
      }
    }
    // load list for search / filters
    this.loadPosts();

    // watch auth state to show/hide create controls for owner
    try {
      const user = this.auth.currentUser as any;
      this.isOwner = Boolean(user?.email === 'andreea@gmail.com');
    } catch {}
    // also react to later changes
    onAuthStateChanged(this.auth as any, (u: any) => {
      this.isOwner = Boolean(u?.email === 'andreea@gmail.com');
    });
  }

  // create a simple sample post and persist
  async createSample(): Promise<void> {
    const sample: Partial<BlogPost> = {
      title: 'New sample post',
      caption: 'Quick sample',
      description: 'This is a sample post created from the UI.',
      image: '',
      category: 'sample',
      date: new Date().toISOString()
    };
    this.loading = true;
    try {
      const created = await this.blogSvc.addPost(sample);
      if (created) this.post = created;
    } finally {
      this.loading = false;
    }
  }

   async loadPosts(): Promise<void> {
    this.loading = true;
    try {
      this.posts = await this.blogSvc.listPosts();
      this.buildCategories();
      this.applyFilters();
    } finally {
      this.loading = false;
    }
  }

  private buildCategories(): void {
    const set = new Set<string>();
    this.posts.forEach(p => { if (p.category) set.add(p.category); });
    this.categories = Array.from(set);
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').toLowerCase();
    this.filtered = this.posts.filter(p => {
      if (this.selectedCategory && this.selectedCategory !== 'all' && p.category !== this.selectedCategory) return false;
      if (term) {
        return (p.title || '').toLowerCase().includes(term) || (p.caption || '').toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term);
      }
      return true;
    });
  }

  // open the inline form for a new post
  openCreate(): void {
    // show overlay card for create
    this.showCreateOverlay = true;
    this.editModel = { title: '', caption: '', description: '', image: '', category: '', date: new Date().toISOString() };
  }

  // open inline edit for an existing post
  openEdit(p: BlogPost): void {
    this.editing = true;
    this.editModel = { ...p };
  }

  // commit create or update
  async createOrUpdatePost(): Promise<void> {
    if (!this.editModel) return;
    this.loading = true;
    try {
      // if editModel has numeric id, try update by numeric id, otherwise add
      if (this.editModel.id) {
        const updated = await this.blogSvc.updatePostByNumericId(Number(this.editModel.id), this.editModel as Partial<BlogPost>);
        if (updated) {
          // refresh lists
          await this.loadPosts();
          this.post = updated;
        }
      } else {
        const created = await this.blogSvc.addPost(this.editModel as Partial<BlogPost>);
        if (created) {
          await this.loadPosts();
          this.post = created;
        }
      }
    } finally {
      this.loading = false;
      this.editing = false;
      this.editModel = {};
      this.showCreateOverlay = false;
    }
  }

 async deletePost(): Promise<void> {
    if (!this.post || !this.post.id) return;
    const confirmed = confirm('Are you sure you want to delete this post? This action cannot be undone.');
    if (!confirmed) return;
    this.loading = true;
    try {
      const success = await this.blogSvc.deletePost(this.post.id);
      if (success) {
        this.post = null;
        await this.loadPosts();
      }
    } finally {
      this.loading = false;
    }
 }


  // cancel editing
  cancelEdit(): void {
    this.editing = false;
    this.editModel = {};
  }
}

