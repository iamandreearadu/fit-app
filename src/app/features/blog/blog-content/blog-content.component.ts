import { Component, Input, OnInit, inject } from '@angular/core';
import { BlogPost } from '../../../core/models/blog.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { BlogService } from '../../../core/services/blog.service';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute } from '@angular/router';
import { BlogFacade } from '../../../core/facade/blog.facade';


@Component({
  selector: 'app-blog-content',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './blog-content.component.html',
  styleUrl: './blog-content.component.css'
})
export class BlogContentComponent {
  @Input() post?: BlogPost | null;

  public blogSvc = inject(BlogService);
  private auth = inject<Auth>(Auth);
  private route = inject(ActivatedRoute);
  public facade = inject(BlogFacade);

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
    this.facade.posts$.subscribe((posts) => {
      this.posts = posts;
      this.categories = this.facade.categories();
      this.applyFilters();
    });
    this.facade.selectedPost$.subscribe((p) => {
      this.post = p;
    });

    // Load posts
    this.loading = true;
    try {
      await this.facade.loadPosts();
    } finally {
      this.loading = false;
    }

    // Dacă URL-ul conține un id, selectează postarea
    if (!this.post) {
      const id = this.route.snapshot.paramMap.get('id');
      await this.facade.getPost(id);
    }

    // if admin authenticated
    const user = this.auth.currentUser;
    this.isOwner = !!user && user.email === 'andreea@gmail.com';
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

  openCreate(): void {
    this.showCreateOverlay = true;
    this.editModel = { title: '', caption: '', description: '', image: '', category: '', date: new Date().toISOString() };
  }

  openEdit(p: BlogPost): void {
    this.editing = true;
    this.editModel = { ...p };
  }


 async createOrUpdatePost(): Promise<void> {
  this.loading = true;
    try {
      await this.facade.createOrUpdatePost(this.editModel);
    } finally {
      this.loading = false;
      this.editing = false;
      this.editModel = {};
      this.showCreateOverlay = false;
    }
    
  }

  async deletePost(uid?:string): Promise<void> {
  const confirmed = confirm('Are you sure you want to delete this post? This action cannot be undone.');
  if (!confirmed) return;
    await this.facade.deletePost(uid);
  }
 
  cancelEdit(): void {
    this.editing = false;
    this.editModel = {};
  }
}

