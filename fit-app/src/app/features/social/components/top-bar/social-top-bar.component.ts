import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { CreateContentComponent } from '../create-content/create-content.component';
import { AccountFacade } from '../../../../core/facade/account.facade';
import { StreakBadgeComponent } from '../../../../shared/components/streak-badge/streak-badge.component';

@Component({
  selector: 'app-social-top-bar',
  standalone: true,
  imports: [MatIconModule, MatDialogModule, RouterLink, StreakBadgeComponent],
  templateUrl: './social-top-bar.component.html',
  styleUrl: './social-top-bar.component.css'
})
export class SocialTopBarComponent {
  private readonly dialog = inject(MatDialog);
  private readonly accountFacade = inject(AccountFacade);

  readonly menuOpen = signal(false);

  openMenu(): void {
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onNewPost(): void {
    this.closeMenu();
    const isMobile = window.innerWidth <= 640;
    this.dialog.open(CreateContentComponent, {
      panelClass: 'create-post-panel',
      maxWidth: isMobile ? '100vw' : '600px',
      width: '100%',
      position: isMobile ? { bottom: '0' } : undefined
    });
  }

  logout(): void {
    this.closeMenu();
    void this.accountFacade.logout();
  }
}
