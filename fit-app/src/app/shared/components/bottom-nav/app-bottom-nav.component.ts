import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ChatFacade } from '../../../core/facade/chat.facade';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app-bottom-nav.component.html',
  styleUrl: './app-bottom-nav.component.css',
})
export class AppBottomNavComponent {
  private readonly chatFacade = inject(ChatFacade);

  /** Sum of unread messages across all conversations. */
  readonly totalUnreadMessages = computed(() =>
    this.chatFacade.conversations().reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  );

}
