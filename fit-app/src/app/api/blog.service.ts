import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/services/alert.service';
import { BlogPost } from '../core/models/blog.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BlogService {

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = `${environment.apiUrl}/api/blog`;

  private mapPost(d: any): BlogPost {
    return {
      uid: String(d.id),
      id: Number(d.id),
      title: d.title ?? '',
      caption: d.caption ?? '',
      description: d.description ?? '',
      image: d.image ?? '',
      category: d.category ?? '',
      date: d.date ?? '',
    };
  }

  async getPost(id: string): Promise<BlogPost | null> {
    if (!id) return null;
    try {
      const dto = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/${id}`));
      return this.mapPost(dto);
    } catch (err) {
      this.alerts?.warn('Failed to load blog post', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async listPosts(): Promise<BlogPost[]> {
    try {
      const dtos = await firstValueFrom(this.http.get<any[]>(this.baseUrl));
      return dtos.map(d => this.mapPost(d));
    } catch (err) {
      this.alerts?.warn('Failed to load posts', (err as any)?.message ?? String(err));
      return [];
    }
  }

  async addPost(payload: Partial<BlogPost>): Promise<BlogPost | null> {
    try {
      const body = {
        title: payload.title ?? '',
        caption: payload.caption ?? '',
        description: payload.description ?? '',
        image: payload.image ?? '',
        category: payload.category ?? '',
        date: payload.date ?? new Date().toISOString().slice(0, 10),
      };
      const dto = await firstValueFrom(this.http.post<any>(this.baseUrl, body));
      return this.mapPost(dto);
    } catch (err) {
      this.alerts?.warn('Failed to add blog post', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async updatePost(docId: string, payload: Partial<BlogPost>): Promise<BlogPost | null> {
    if (!docId) return null;
    try {
      const body = {
        title: payload.title ?? '',
        caption: payload.caption ?? '',
        description: payload.description ?? '',
        image: payload.image ?? '',
        category: payload.category ?? '',
        date: payload.date ?? '',
      };
      const dto = await firstValueFrom(this.http.put<any>(`${this.baseUrl}/${docId}`, body));
      return this.mapPost(dto);
    } catch (err) {
      this.alerts?.warn('Failed to update post', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async updatePostByNumericId(id: number, payload: Partial<BlogPost>): Promise<BlogPost | null> {
    return this.updatePost(String(id), payload);
  }

  async deletePostByUid(uid: string): Promise<boolean> {
    if (!uid) return false;
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${uid}`));
      this.alerts?.success('Blog post deleted');
      return true;
    } catch (err) {
      this.alerts?.warn('Failed to delete blog post', (err as any)?.message ?? String(err));
      return false;
    }
  }
}
