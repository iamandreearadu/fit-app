import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserStore } from '../../../../core/store/user.store';
import { CreateContentComponent } from '../create-content/create-content.component';

@Component({
  selector: 'app-social-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatDialogModule],
  templateUrl: './social-bottom-nav.component.html',
  styleUrl: './social-bottom-nav.component.css'
})
export class SocialBottomNavComponent {
  @Input() unreadNotifications = 0;
  @Input() unreadMessages = 0;

  private readonly userStore = inject(UserStore);
  private readonly dialog = inject(MatDialog);
  readonly userId = computed(() => this.userStore.user()?.id ?? 'me');

  onNewPost(): void {
    this.dialog.open(CreateContentComponent, {
      panelClass: 'create-post-panel',
      maxWidth: '600px',
      width: '100%'
    });
  }
}
