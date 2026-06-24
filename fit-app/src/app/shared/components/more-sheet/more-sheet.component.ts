import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { AccountFacade } from '../../../core/facade/account.facade';

interface MoreItem {
  icon: string;
  label: string;
  action: () => void;
  class?: string;
}

@Component({
  selector: 'app-more-sheet',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './more-sheet.component.html',
  styleUrl: './more-sheet.component.css',
})
export class MoreSheetComponent {
  private readonly sheetRef = inject(MatBottomSheetRef);
  private readonly router = inject(Router);
  private readonly accountFacade = inject(AccountFacade);

  readonly items: MoreItem[] = [
    {
      icon: 'smart_toy',
      label: 'AI Assistant',
      action: () => this.navigate('/ai-assistant'),
    },
    {
      icon: 'article',
      label: 'Blog',
      action: () => this.navigate('/blog'),
    },
    {
      icon: 'home',
      label: 'Home',
      action: () => this.navigate('/'),
    },
  ];

  readonly logoutItem: MoreItem = {
    icon: 'logout',
    label: 'Log Out',
    action: () => this.logout(),
    class: 'more-item--danger',
  };

  private navigate(route: string): void {
    this.sheetRef.dismiss();
    this.router.navigate([route]);
  }

  private logout(): void {
    this.sheetRef.dismiss();
    this.accountFacade.logout();
    this.router.navigate(['/']);
  }
}
