import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
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

  /** Open the single social post composer. */
  openCreateContent(): void {
    const returnUrl = this.router.url;
    this.sheetRef.dismiss();
    this.router.navigate(['/social/new-post'], { state: { returnUrl } });
  }

  navigateTo(route: string, queryParams?: Record<string, string>): void {
    this.sheetRef.dismiss();
    this.router.navigate([route], queryParams ? { queryParams } : undefined);
  }
}
