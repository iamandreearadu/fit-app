import { Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { BlogFacade } from '../../../core/facade/blog.facade';
import { AuthenticationStore } from '../../../core/store/auth.store';
import { RouterLink } from '@angular/router';
import { BlogPost } from '../../../core/models/blog.model';

@Component({
  selector: 'app-blog-content',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, RouterLink],
  templateUrl: './blog-content.component.html',
  styleUrl: './blog-content.component.css'
})
export class BlogContentComponent implements OnInit {

  private authStore = inject(AuthenticationStore);
  readonly facade = inject(BlogFacade);

  loading = false;

  posts: BlogPost[] = [];
  filtered: BlogPost[] = [];

  searchTerm = '';
  selectedCategory = 'all';
  categories: string[] = [];

  showCategoryDropdown = false;

  editing = false;
  showCreateOverlay = false;
  editModel: Partial<BlogPost> = {};

  get isOwner(): boolean {
    return this.authStore.isAdmin();
  }

  constructor() {
    effect(() => {
      this.posts = this.facade.posts;
      this.categories = this.facade.categories();
      this.applyFilters();
    });
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      await this.facade.loadPosts();
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();

    this.filtered = this.posts.filter(p => {
      if (this.selectedCategory !== 'all' && p.category !== this.selectedCategory) {
        return false;
      }

      if (!term) return true;

      return (
        p.title?.toLowerCase().includes(term) ||
        p.caption?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    });
  }

  openCreate(): void {
    this.showCreateOverlay = true;
    this.editModel = {
      title: '',
      caption: '',
      description: '',
      image: '',
      category: '',
      date: new Date().toISOString()
    };
  }

  openEdit(post: BlogPost): void {
    this.editing = true;
    this.showCreateOverlay = true;
    this.editModel = { ...post };
  }

  async createOrUpdatePost(): Promise<void> {
    this.loading = true;
    try {
      await this.facade.createOrUpdatePost(this.editModel);
    } finally {
      this.loading = false;
      this.editing = false;
      this.showCreateOverlay = false;
      this.editModel = {};
    }
  }

  async deletePost(uid?: string): Promise<void> {
    if (!uid) return;
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    await this.facade.deletePost(uid);
  }

  cancelEdit(): void {
    this.editing = false;
    this.showCreateOverlay = false;
    this.editModel = {};
  }

  cardImage(image?: string): string {
    const fallback = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=70&w=720&auto=format&fit=crop';
    if (!image) return fallback;

    try {
      const url = new URL(image);
      if (url.hostname === 'images.unsplash.com') {
        url.searchParams.set('auto', 'format');
        url.searchParams.set('fit', 'crop');
        url.searchParams.set('w', '720');
        url.searchParams.set('h', '450');
        url.searchParams.set('q', '70');
      }
      return url.toString();
    } catch {
      return image;
    }
  }
}
