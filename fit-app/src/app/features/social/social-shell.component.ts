import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SocialSideNavComponent } from './components/side-nav/social-side-nav.component';
import { SocialTopBarComponent } from './components/top-bar/social-top-bar.component';
import { SocialBottomNavComponent } from './components/bottom-nav/social-bottom-nav.component';
import { SocialNotificationsFacade } from '../../core/facade/social-notifications.facade';
import { SocialChatFacade } from '../../core/facade/social-chat.facade';
import { AuthenticationStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-social-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SocialSideNavComponent,
    SocialTopBarComponent,
    SocialBottomNavComponent,
  ],
  templateUrl: './social-shell.component.html',
  styleUrl: './social-shell.component.css'
})
export class SocialShellComponent implements OnInit {
  protected readonly notifFacade = inject(SocialNotificationsFacade);
  protected readonly chatFacade = inject(SocialChatFacade);
  private readonly authStore = inject(AuthenticationStore);

  readonly isMobile = signal(false);

  constructor() {
    inject(BreakpointObserver)
      .observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed())
      .subscribe(result => this.isMobile.set(result.matches));
  }

  ngOnInit(): void {
    const token = this.authStore.authUser()?.token;
    if (token) {
      // Hubs are connected by account.facade on login/init.
      // connectHub() is idempotent (no-op if already connected), but we
      // call it here as a safety net in case the user deep-links directly
      // into /social without going through the login flow in this session.
      this.notifFacade.connectHub(token);
      this.chatFacade.connectHub(token);
      // Guard: only load if not already populated to avoid re-fetching on every child route navigation
      if (this.chatFacade.conversations().length === 0) {
        this.chatFacade.loadConversations();
      }
    }
  }
}
