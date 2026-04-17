import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialFacade } from '../../../core/facade/social.facade';
import { ArticleDetail } from '../../../core/models/social.model';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.css'
})
export class ArticleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(SocialFacade);

  article = signal<ArticleDetail | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  likedByMe = signal(false);
  likesCount = signal(0);
  commentsCount = signal(0);

  private returnUrl = '/social/feed';

  ngOnInit(): void {
    this.returnUrl = (this.router.getCurrentNavigation()?.extras.state?.['returnUrl']
      ?? history.state?.returnUrl
      ?? '/social/feed') as string;

    const id = parseInt(this.route.snapshot.paramMap.get('id') ?? '0', 10);
    this.facade.getArticle(id).then(a => {
      this.article.set(a);
      this.likedByMe.set(a.isLikedByMe);
      this.likesCount.set(a.likesCount);
      this.commentsCount.set(a.commentsCount);
    }).catch(() => {
      this.error.set('Could not load article.');
    }).finally(() => {
      this.isLoading.set(false);
    });
  }

  goBack(): void {
    this.router.navigateByUrl(this.returnUrl);
  }

  goToProfile(): void {
    const authorId = this.article()?.author.id;
    if (authorId) this.router.navigate(['/social/profile', authorId]);
  }

  toggleLike(): void {
    const postId = this.article()?.linkedPostId;
    if (!postId) return;
    const prev = this.likedByMe();
    this.likedByMe.set(!prev);
    this.likesCount.update(n => prev ? n - 1 : n + 1);
    this.facade.toggleLike(postId);
  }

  goToComments(): void {
    const postId = this.article()?.linkedPostId;
    if (!postId) return;
    this.router.navigate(['/social/post', postId], {
      state: { returnUrl: this.router.url }
    });
  }
}
