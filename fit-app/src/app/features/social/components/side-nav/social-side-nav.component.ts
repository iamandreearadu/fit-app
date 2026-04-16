import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserStore } from '../../../../core/store/user.store';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { MatDialog } from '@angular/material/dialog';
import { CreateContentComponent } from '../create-content/create-content.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact: boolean;
  badge?: 'messages' | 'notifs';
}

@Component({
  selector: 'app-social-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './social-side-nav.component.html',
  styleUrl: './social-side-nav.component.css',
})
export class SocialSideNavComponent {
  @Input() unreadNotifications = 0;
  @Input() unreadMessages = 0;

  protected readonly facade = inject(SocialFacade);
  private readonly dialog = inject(MatDialog);

  private readonly userStore = inject(UserStore);

  readonly userName = computed(() => this.userStore.user()?.fullName ?? 'You');
  readonly userAvatar = computed(() => this.userStore.user()?.imageUrl ?? '');
  readonly userId = computed(() => this.userStore.user()?.id ?? 'me');

  readonly navItems: NavItem[] = [
    { label: 'Feed', icon: 'home', route: '/social', exact: true },
    {
      label: 'Discover',
      icon: 'explore',
      route: '/social/discover',
      exact: false,
    },
    {
      label: 'Chat',
      icon: 'chat_bubble',
      route: '/social/chat',
      exact: false,
      badge: 'messages',
    },
    {
      label: 'Notifications',
      icon: 'notifications',
      route: '/social/notifications',
      exact: false,
      badge: 'notifs',
    },
    {
      label: 'My Profile',
      icon: 'person',
      route: '/social/profile/me',
      exact: false,
    },
  ];

  openCreatePost(): void {
    this.dialog
      .open(CreateContentComponent, {
        panelClass: 'create-post-panel',
        maxWidth: '600px',
        width: '100%',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.facade.loadFeed(true);
      });
  }
}
