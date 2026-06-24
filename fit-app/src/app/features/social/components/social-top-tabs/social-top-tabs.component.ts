import { Component, Input, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-social-top-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './social-top-tabs.component.html',
  styleUrl: './social-top-tabs.component.css',
})
export class SocialTopTabsComponent {
  @Input() unreadMessages = 0;
  @Input() unreadNotifications = 0;

  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Hide tabs on detail sub-routes (post/:id, article/:id, chat/:id, profile/:id) */
  readonly showTabs = computed(() => {
    const url = this.currentUrl() ?? '';
    const mainRoutes = ['/social', '/social/discover', '/social/chat', '/social/notifications'];
    return mainRoutes.some(r => url === r || url.startsWith(r + '?'));
  });
}
