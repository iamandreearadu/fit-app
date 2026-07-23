import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UserService } from '../../../api/user.service';
import { AccountFacade } from '../../../core/facade/account.facade';
import { MaterialModule } from '../../../core/material/material.module';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: true,
  selector: 'app-settings-tab',
  imports: [MaterialModule],
  templateUrl: './settings-tab.component.html',
  styleUrls: ['../coming-soon-tab.css', './settings-tab.component.css'],
})
export class SettingsTabComponent {
  private readonly dialog = inject(MatDialog);
  private readonly userService = inject(UserService);
  private readonly accountFacade = inject(AccountFacade);
  private readonly router = inject(Router);

  readonly deleting = signal(false);

  openDeleteConfirmation(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete account?',
        message: 'Are you sure you want to delete this account? This will be deleted permanently.',
        confirmLabel: 'Yes, I am sure',
        cancelLabel: 'Cancel',
        dangerous: true,
      },
      panelClass: 'confirm-dialog-panel',
      backdropClass: 'novafit-glass-backdrop',
      width: 'min(420px, calc(100vw - 32px))',
      maxWidth: '420px',
      autoFocus: false,
      restoreFocus: true,
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed === true) void this.deleteAccount();
    });
  }

  private async deleteAccount(): Promise<void> {
    if (this.deleting()) return;
    this.deleting.set(true);
    try {
      const deleted = await this.userService.deleteAccount();
      if (!deleted) return;

      await this.accountFacade.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.deleting.set(false);
    }
  }
}
