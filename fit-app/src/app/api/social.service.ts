import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Post,
  Comment,
  UserSocialProfile,
  LikeToggleResponse,
  FollowToggleResponse,
  PaginatedResponse,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UserSearchResult,
  ProfileWorkout,
  ProfileBlog,
  ArchiveToggleResponse,
  UpdateBioRequest,
  CreateBlogRequest,
  UpdateBlogRequest,
  ArticleDetail
} from '../core/models/social.model';

/** Ensures imageUrl is always a renderable src (handles legacy raw-base64 posts). */
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/')) return url;
  // Legacy format: raw base64 without the data URI prefix.
  // Detect image type from the first base64-encoded bytes (magic bytes).
  if (url.startsWith('/9j/') || url.startsWith('FFD8')) return `data:image/jpeg;base64,${url}`;
  if (url.startsWith('iVBOR')) return `data:image/png;base64,${url}`;
  if (url.startsWith('R0lGO')) return `data:image/gif;base64,${url}`;
  if (url.startsWith('UklGR')) return `data:image/webp;base64,${url}`;
  return `data:image/jpeg;base64,${url}`; // safe fallback
}

function normalizePosts<T extends { imageUrl?: string }>(items: T[]): T[] {
  return items.map(p => ({ ...p, imageUrl: normalizeImageUrl(p.imageUrl) }));
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/social`;

  getFeed(page = 1, pageSize = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<Post>>(`${this.base}/feed`, { params }).pipe(
      map(r => ({ ...r, items: normalizePosts(r.items) }))
    );
  }

  getDiscover(page = 1, pageSize = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<Post>>(`${this.base}/discover`, { params }).pipe(
      map(r => ({ ...r, items: normalizePosts(r.items) }))
    );
  }

  createPost(req: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(`${this.base}/posts`, req).pipe(
      map(p => ({ ...p, imageUrl: normalizeImageUrl(p.imageUrl) }))
    );
  }

  updatePost(id: number, req: UpdatePostRequest): Observable<Post> {
    return this.http.patch<Post>(`${this.base}/posts/${id}`, req).pipe(
      map(p => ({ ...p, imageUrl: normalizeImageUrl(p.imageUrl) }))
    );
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/posts/${id}`);
  }

  toggleLike(postId: number): Observable<LikeToggleResponse> {
    return this.http.post<LikeToggleResponse>(`${this.base}/posts/${postId}/like`, {});
  }

  getComments(postId: number, page = 1, pageSize = 20): Observable<PaginatedResponse<Comment>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<Comment>>(`${this.base}/posts/${postId}/comments`, { params });
  }

  addComment(postId: number, req: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/posts/${postId}/comments`, req);
  }

  deleteComment(postId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/posts/${postId}/comments/${commentId}`);
  }

  toggleFollow(userId: string): Observable<FollowToggleResponse> {
    return this.http.post<FollowToggleResponse>(`${this.base}/follow/${userId}`, {});
  }

  getProfile(userId: string): Observable<UserSocialProfile> {
    return this.http.get<UserSocialProfile>(`${this.base}/profile/${userId}`);
  }

  getProfilePosts(userId: string, page = 1, pageSize = 12): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<Post>>(`${this.base}/profile/${userId}/posts`, { params }).pipe(
      map(r => ({ ...r, items: normalizePosts(r.items) }))
    );
  }

  searchUsers(q: string, limit = 20): Observable<UserSearchResult[]> {
    const params = new HttpParams().set('q', q).set('limit', limit);
    return this.http.get<UserSearchResult[]>(`${this.base}/users/search`, { params });
  }

  // ── Archive & Profile Sections ─────────────────────────────────────────────

  archivePost(id: number): Observable<ArchiveToggleResponse> {
    return this.http.patch<ArchiveToggleResponse>(`${this.base}/posts/${id}/archive`, {});
  }

  getArchivedPosts(userId: string, page = 1, pageSize = 12): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<Post>>(`${this.base}/profile/${userId}/archived-posts`, { params }).pipe(
      map(r => ({ ...r, items: normalizePosts(r.items) }))
    );
  }

  getProfileWorkouts(userId: string, page = 1, pageSize = 12): Observable<PaginatedResponse<ProfileWorkout>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<ProfileWorkout>>(`${this.base}/profile/${userId}/workouts`, { params });
  }

  archiveWorkout(id: number): Observable<ArchiveToggleResponse> {
    return this.http.patch<ArchiveToggleResponse>(`${this.base}/profile/workouts/${id}/archive`, {});
  }

  deleteWorkout(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/profile/workouts/${id}`);
  }

  getProfileBlogs(userId: string, page = 1, pageSize = 12): Observable<PaginatedResponse<ProfileBlog>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<ProfileBlog>>(`${this.base}/profile/${userId}/blogs`, { params });
  }

  archiveBlog(id: number): Observable<ArchiveToggleResponse> {
    return this.http.patch<ArchiveToggleResponse>(`${this.base}/profile/blogs/${id}/archive`, {});
  }

  deleteBlog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/profile/blogs/${id}`);
  }

  updateBio(bio: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/profile/bio`, { bio } satisfies UpdateBioRequest);
  }

  createBlog(req: CreateBlogRequest): Observable<ProfileBlog> {
    return this.http.post<ProfileBlog>(`${this.base}/profile/blogs/create`, req);
  }

  updateBlogPost(id: number, req: UpdateBlogRequest): Observable<ProfileBlog> {
    return this.http.put<ProfileBlog>(`${this.base}/profile/blogs/${id}`, req);
  }

  getArticle(id: number): Observable<ArticleDetail> {
    return this.http.get<ArticleDetail>(`${this.base}/articles/${id}`);
  }
}
