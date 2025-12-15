import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { BlogFacade } from '../../../core/facade/blog.facade';
import { Auth } from '@angular/fire/auth';
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

  private auth = inject(Auth);
  readonly facade = inject(BlogFacade);

  loading = false;

  posts: BlogPost[] = [];
  filtered: BlogPost[] = [];

  searchTerm = '';
  selectedCategory = 'all';
  categories: string[] = [];

  editing = false;
  showCreateOverlay = false;
  editModel: Partial<BlogPost> = {};

  isOwner = false;

  async ngOnInit(): Promise<void> {
    this.facade.posts$.subscribe(posts => {
      this.posts = posts;
      this.categories = this.facade.categories();
      this.applyFilters();
    });

    this.loading = true;
    try {
      await this.facade.loadPosts();
    } finally {
      this.loading = false;
    }

    const user = this.auth.currentUser;
    this.isOwner = !!user && user.email === 'andreea@gmail.com';
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

    const confirmed = confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    await this.facade.deletePost(uid);
  }

  cancelEdit(): void {
    this.editing = false;
    this.showCreateOverlay = false;
    this.editModel = {};
  }
}
