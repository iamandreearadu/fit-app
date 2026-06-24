import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ChatFacade } from '../../../core/facade/chat.facade';
import { CreateActionSheetComponent } from '../create-action-sheet/create-action-sheet.component';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app-bottom-nav.component.html',
  styleUrl: './app-bottom-nav.component.css',
})
export class AppBottomNavComponent {
  private readonly chatFacade = inject(ChatFacade);
  private readonly bottomSheet = inject(MatBottomSheet);

  /** Sum of unread messages across all conversations. */
  readonly totalUnreadMessages = computed(() =>
    this.chatFacade.conversations().reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  );

  openCreateSheet(): void {
    this.bottomSheet.open(CreateActionSheetComponent, {
      panelClass: 'create-action-sheet',
    });
  }
}
