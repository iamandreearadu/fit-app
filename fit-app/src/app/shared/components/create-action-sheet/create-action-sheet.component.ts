import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-create-action-sheet',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './create-action-sheet.component.html',
  styleUrl: './create-action-sheet.component.css',
})
export class CreateActionSheetComponent {
  private readonly sheetRef = inject(MatBottomSheetRef<CreateActionSheetComponent>);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  /** Open CreateContentComponent in the default post mode (or article — same dialog, user toggles). */
  async openCreateContent(): Promise<void> {
    this.sheetRef.dismiss();
    const { CreateContentComponent } = await import(
      '../../../features/social/components/create-content/create-content.component'
    );
    const isMobile = window.innerWidth <= 640;
    this.dialog.open(CreateContentComponent, {
      panelClass: 'create-post-panel',
      maxWidth: isMobile ? '100vw' : '600px',
      width: '100%',
      position: isMobile ? { bottom: '0' } : undefined,
    });
  }

  navigateTo(route: string, queryParams?: Record<string, string>): void {
    this.sheetRef.dismiss();
    this.router.navigate([route], queryParams ? { queryParams } : undefined);
  }
}
