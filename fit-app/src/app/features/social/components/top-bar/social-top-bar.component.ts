import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateContentComponent } from '../create-content/create-content.component';

@Component({
  selector: 'app-social-top-bar',
  standalone: true,
  imports: [MatIconModule, MatDialogModule],
  templateUrl: './social-top-bar.component.html',
  styleUrl: './social-top-bar.component.css'
})
export class SocialTopBarComponent {
  private readonly dialog = inject(MatDialog);

  onNewPost(): void {
    const isMobile = window.innerWidth <= 640;
    this.dialog.open(CreateContentComponent, {
      panelClass: 'create-post-panel',
      maxWidth: isMobile ? '100vw' : '600px',
      width: '100%',
      position: isMobile ? { bottom: '0' } : undefined
    });
  }
}
