import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SocialProfileFacade } from '../../../core/facade/social-profile.facade';
import { UserStore } from '../../../core/store/user.store';
import { AuthenticationStore } from '../../../core/store/auth.store';
import { AlertService } from '../../../shared/services/alert.service';

@Component({
  selector: 'app-archived-posts',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './archived-posts.component.html',
  styleUrl: './archived-posts.component.css',
})
export class ArchivedPostsComponent implements OnInit {
  readonly facade = inject(SocialProfileFacade);
  private readonly userStore = inject(UserStore);
  private readonly authStore = inject(AuthenticationStore);
  private readonly alerts = inject(AlertService);
  readonly brokenImages = new Set<number>();
  userId = '';

  ngOnInit(): void {
    this.userId = this.userStore.user()?.id ?? this.authStore.authUser()?.id ?? '';
    if (this.userId) void this.facade.loadArchivedPosts(this.userId);
  }

  async restore(event: Event, postId: number): Promise<void> {
    event.stopPropagation();
    try {
      await this.facade.unarchivePost(postId);
      this.alerts.success('Post restored.');
    } catch {
      this.alerts.error('Could not restore the post.');
    }
  }
}
