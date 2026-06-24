import {
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { AccountFacade } from '../../../core/facade/account.facade';
import { NotificationFacade } from '../../../core/facade/notification.facade';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './app-top-bar.component.html',
  styleUrl: './app-top-bar.component.css',
})
export class AppTopBarComponent {
  private readonly accountFacade = inject(AccountFacade);
  private readonly notifFacade = inject(NotificationFacade);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** Emits when the hamburger icon is tapped — parent opens the side drawer. */
  @Output() hamburgerClick = new EventEmitter<void>();

  readonly isAuthenticated = computed(() => this.accountFacade.authUser() !== null);
  readonly unreadNotifications = computed(() => this.notifFacade.unreadCount());

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Non-empty string on routes that show a back-button + title on the left.
   * Empty string on root/hub routes that show the hamburger.
   */
  readonly contextTitle = computed((): string => {
    const url = this.currentUrl() ?? '';
    if (/^\/social\/post\/[^/]+/.test(url)) return 'Post';
    if (/^\/social\/article\/[^/]+/.test(url)) return 'Article';
    // Chat thread (has numeric/string :id after /chat/)
    if (/^\/social\/chat\/[^/]+/.test(url)) return 'Message';
    // Other user profile — NOT /me
    if (/^\/social\/profile\/(?!me([/?#]|$))[^/]+/.test(url)) return 'Profile';
    if (url === '/social/discover' || url.startsWith('/social/discover?')) return 'Discover';
    if (url === '/social/notifications' || url.startsWith('/social/notifications?')) return 'Notifications';
    if (/^\/blog\/[^/]+/.test(url)) return 'Blog';
    if (url.startsWith('/workout-session')) return 'Session';
    return '';
  });

  /**
   * Screen title shown in the center on root/hub routes.
   * Empty string falls through to the NovaFit wordmark.
   */
  readonly centerTitle = computed((): string => {
    if (this.contextTitle()) return ''; // detail route — left owns the title
    const url = this.currentUrl() ?? '';
    if (url === '/social' || url === '/social/') return 'Feed';
    if (url.startsWith('/user-dashboard')) return 'Today';
    if (url === '/social/chat' || url === '/social/chat/') return 'Messages';
    if (url.startsWith('/social/profile/me')) return 'Profile';
    if (url === '/blog' || url === '/blog/') return 'Blog';
    if (url.startsWith('/plans')) return 'Plans';
    if (url.startsWith('/ai-assistant')) return 'AI';
    if (url.startsWith('/account')) return 'Account';
    return '';
  });

  /**
   * True on routes where the right-side icons (search + bell) should be hidden.
   * These are immersive detail views where the icons would be distracting or redundant.
   */
  readonly hideRightIcons = computed((): boolean => {
    const url = this.currentUrl() ?? '';
    return (
      /^\/social\/chat\/[^/]+/.test(url) ||
      /^\/social\/post\/[^/]+/.test(url) ||
      /^\/social\/article\/[^/]+/.test(url) ||
      /^\/blog\/[^/]+/.test(url) ||
      url.startsWith('/workout-session') ||
      url.startsWith('/ai-assistant') ||
      url.startsWith('/account')
    );
  });

  goBack(): void {
    this.location.back();
  }

  goToDiscover(): void {
    this.router.navigate(['/social/discover']);
  }

  goToNotifications(): void {
    this.router.navigate(['/social/notifications']);
  }
}
