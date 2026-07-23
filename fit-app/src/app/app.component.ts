import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { MoveUpComponent } from './shared/components/move-up/move-up.component';
import { AiChatFabComponent } from './core/components/ai-chat-fab/ai-chat-fab.component';
import { AppBottomNavComponent } from './shared/components/bottom-nav/app-bottom-nav.component';
import { AppTopBarComponent } from './shared/components/top-bar/app-top-bar.component';
import { AppSideDrawerComponent } from './shared/components/side-drawer/app-side-drawer.component';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MoveUpComponent,
    AiChatFabComponent,
    AppBottomNavComponent,
    AppTopBarComponent,
    AppSideDrawerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly pwaUpdates = inject(PwaUpdateService);

  readonly isMobile = signal(false);
  readonly drawerOpen = signal(false);
  private readonly currentRoute = signal('/');

  /**
   * True when the global mobile shell chrome (top bar + bottom nav) should render.
   *
   * Excluded routes:
   *   - Auth / onboarding / workout session — unauthenticated or full-screen focused
   *   - Detail routes — chat thread, post, article, blog, workout session
   *     (immersive views where nav chrome would interfere with the content)
   */
  readonly showMainNav = computed(() => {
    const route = this.currentRoute();
    const excluded = ['/onboarding', '/login', '/register'];
    const detailPrefixes = [
      '/workout-session',   // full-screen session mode
      '/social/chat/',      // individual chat thread (keyboard + input area)
      '/social/post/',      // immersive post + comments
    ];
    const isExcluded = excluded.some(p => route.startsWith(p)) || route.startsWith('/ai-assistant');
    const isDetail = detailPrefixes.some(p => route.startsWith(p));
    return this.isMobile() && !isExcluded && !isDetail;
  });

  readonly showTopBar = computed(() => {
    return this.showMainNav();
  });

  readonly showBottomNav = computed(() => {
    const route = this.currentRoute();
    return this.showMainNav() && route !== '/social/new-post' && !route.startsWith('/social/new-post?');
  });

  /**
   * AI Chat FAB extra bottom offset.
   * The daily-panel-fab is desktop-only after this redesign, so mobile offset is always 0.
   */
  readonly aiFabExtraOffset = 0;

  constructor() {
    const bp = inject(BreakpointObserver);
    bp.observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed())
      .subscribe(result => this.isMobile.set(result.matches));

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe((e: NavigationEnd) => {
      this.currentRoute.set(e.urlAfterRedirects);
      // Close side drawer on any navigation
      this.drawerOpen.set(false);
      this.scrollRouteToTop();
    });
  }

  /**
   * Some application shells own their scrolling instead of the browser window.
   * Reset those containers after the routed view has rendered so every link
   * opens at the beginning of its destination page as well.
   */
  private scrollRouteToTop(): void {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.querySelectorAll<HTMLElement>('[data-route-scroll-container]')
        .forEach(container => container.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    });
  }
}
