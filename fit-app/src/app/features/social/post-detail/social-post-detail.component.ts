import { Component, inject, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SocialService } from '../../../api/social.service';
import { SocialFacade } from '../../../core/facade/social.facade';
import { Comment, Post, CreateCommentRequest } from '../../../core/models/social.model';
import { PostCardComponent } from '../components/post-card/post-card.component';
import { EditPostComponent } from '../components/edit-post/edit-post.component';

@Component({
  selector: 'app-social-post-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PostCardComponent
  ],
  templateUrl: './social-post-detail.component.html',
  styleUrl: './social-post-detail.component.css'
})
export class SocialPostDetailComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly socialSvc = inject(SocialService);
  protected readonly facade = inject(SocialFacade);
  private readonly dialog = inject(MatDialog);

  post = signal<Post | null>(null);
  comments = signal<Comment[]>([]);
  isLoadingPost = signal(false);
  isLoadingComments = signal(false);
  postError = signal<string | null>(null);
  commentsError = signal<string | null>(null);
  commentInput = signal('');
  isSubmittingComment = signal(false);
  commentSkeletons = Array.from({ length: 4 });

  @ViewChild('commentsList') commentsListRef!: ElementRef;
  @ViewChild('commentInputEl') commentInputRef!: ElementRef;

  protected postId = 0;
  private returnUrl = '/social/feed';

  ngOnInit(): void {
    this.returnUrl = (this.router.getCurrentNavigation()?.extras.state?.['returnUrl']
      ?? history.state?.returnUrl
      ?? '/social/feed') as string;

    const idParam = this.route.snapshot.paramMap.get('id');
    this.postId = idParam ? parseInt(idParam, 10) : 0;

    this.loadPost();
    this.loadComments();
  }

  ngAfterViewInit(): void {}

  private loadPost(): void {
    const local = this.facade.feed().find(p => p.id === this.postId)
      ?? this.facade.profilePosts().find(p => p.id === this.postId)
      ?? this.facade.discoverPosts().find(p => p.id === this.postId);
    if (local) {
      this.post.set(local);
      return;
    }
    this.isLoadingPost.set(true);
    this.postError.set(null);
    firstValueFrom(this.socialSvc.getPost(this.postId)).then(p => {
      this.post.set(p);
    }).catch(() => {
      this.postError.set('Could not load post.');
    }).finally(() => {
      this.isLoadingPost.set(false);
    });
  }

  private loadComments(): void {
    this.isLoadingComments.set(true);
    this.commentsError.set(null);
    firstValueFrom(this.socialSvc.getComments(this.postId)).then(res => {
      this.comments.set(res.items);
    }).catch(() => {
      this.commentsError.set('Failed to load comments.');
    }).finally(() => {
      this.isLoadingComments.set(false);
    });
  }

  onLikePost(): void {
    if (this.post()) {
      this.facade.toggleLike(this.postId);
      // Update local signal too
      this.post.update(p => p ? {
        ...p,
        isLikedByMe: !p.isLikedByMe,
        likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1
      } : p);
    }
  }

  async submitComment(): Promise<void> {
    const text = this.commentInput().trim();
    if (!text || this.isSubmittingComment()) return;
    this.isSubmittingComment.set(true);
    try {
      const req: CreateCommentRequest = { content: text };
      const comment = await firstValueFrom(this.socialSvc.addComment(this.postId, req));
      this.comments.update(cs => [...cs, comment]);
      this.commentInput.set('');
      this.post.update(p => p ? { ...p, commentsCount: p.commentsCount + 1 } : p);
      // Scroll to bottom
      setTimeout(() => {
        this.commentsListRef?.nativeElement?.scrollTo({
          top: this.commentsListRef.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    } catch {
      // silently ignore
    } finally {
      this.isSubmittingComment.set(false);
    }
  }

  async deleteComment(postId: number, commentId: number): Promise<void> {
    try {
      await firstValueFrom(this.socialSvc.deleteComment(postId, commentId));
      this.comments.update(cs => cs.filter(c => c.id !== commentId));
      this.post.update(p => p ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p);
    } catch {
      // silently ignore
    }
  }

  async onDeletePost(postId: number): Promise<void> {
    await this.facade.deletePost(postId);
    this.router.navigate(['/social/feed']);
  }

  onEditPost(post: Post): void {
    this.dialog.open(EditPostComponent, {
      data: { post },
      panelClass: 'create-post-panel',
      maxWidth: '560px',
      width: '100%'
    }).afterClosed().subscribe(saved => {
      if (saved) {
        // Reflect changes locally from facade
        const updated = this.facade.feed().find(p => p.id === post.id)
          ?? this.facade.profilePosts().find(p => p.id === post.id);
        if (updated) this.post.set(updated);
      }
    });
  }

  focusCommentInput(): void {
    this.commentInputRef?.nativeElement?.focus();
  }

  onCommentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitComment();
    }
  }

  goBack(): void {
    this.router.navigateByUrl(this.returnUrl);
  }
}
