import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SocialSideNavComponent } from './components/side-nav/social-side-nav.component';
import { SocialDailyPanelComponent } from './components/daily-panel/social-daily-panel.component';
import { NotificationFacade } from '../../core/facade/notification.facade';
import { ChatFacade } from '../../core/facade/chat.facade';
import { ChatHubService } from '../../core/services/chat-hub.service';
import { AuthenticationStore } from '../../core/store/auth.store';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-social-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SocialSideNavComponent,
    SocialDailyPanelComponent,
    MatIconModule,
  ],
  templateUrl: './social-shell.component.html',
  styleUrl: './social-shell.component.css'
})
export class SocialShellComponent implements OnInit {
  protected readonly notifFacade = inject(NotificationFacade);
  protected readonly chatFacade = inject(ChatFacade);
  private readonly chatHub = inject(ChatHubService);
  private readonly authStore = inject(AuthenticationStore);

  readonly isMobile = signal(false);
  readonly dailyPanelOpen = signal(false);
  readonly isNarrow = signal(false);   // <1200px — panel becomes drawer

  readonly isReconnecting = toSignal(
    this.chatHub.connectionState$.pipe(map(s => s === 'reconnecting')),
    { initialValue: false }
  );

  constructor() {
    const bp = inject(BreakpointObserver);
    bp.observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed())
      .subscribe(result => this.isMobile.set(result.matches));
    bp.observe(['(max-width: 1199px)'])
      .pipe(takeUntilDestroyed())
      .subscribe(result => {
        this.isNarrow.set(result.matches);
        if (!result.matches) this.dailyPanelOpen.set(false);
      });
  }

  toggleDailyPanel(): void { this.dailyPanelOpen.update(v => !v); }
  closeDailyPanel(): void  { this.dailyPanelOpen.set(false); }

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
