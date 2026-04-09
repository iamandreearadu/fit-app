import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserStore } from '../../../../core/store/user.store';

@Component({
  selector: 'app-social-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './social-bottom-nav.component.html',
  styleUrl: './social-bottom-nav.component.css'
})
export class SocialBottomNavComponent {
  @Input() unreadNotifications = 0;

  private readonly userStore = inject(UserStore);
  readonly userId = computed(() => this.userStore.user()?.id ?? 'me');

  onNewPost(): void {
    // Placeholder — new post flow will be implemented in the post creation feature
  }
}
