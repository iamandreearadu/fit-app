import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="confirm-icon">
        <mat-icon>{{ data.dangerous ? 'delete_outline' : 'help_outline' }}</mat-icon>
      </div>
      <h2 class="confirm-title">{{ data.title ?? 'Are you sure?' }}</h2>
      <p class="confirm-message">{{ data.message }}</p>
      <div class="confirm-actions">
        <button class="btn-ghost confirm-btn" (click)="cancel()" type="button">
          {{ data.cancelLabel ?? 'Cancel' }}
        </button>
        <button
          class="confirm-btn confirm-btn--danger"
          [class.confirm-btn--primary]="!data.dangerous"
          (click)="confirm()"
          type="button"
        >
          {{ data.confirmLabel ?? 'Delete' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 28px 24px 20px;
      text-align: center;
      background: var(--surface);
    }

    .confirm-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: rgba(255, 64, 129, 0.75);
    }

    .confirm-title {
      font-size: 17px;
      font-weight: 600;
      color: var(--white);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .confirm-message {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
      line-height: 1.5;
      max-width: 280px;
    }

    .confirm-actions {
      display: flex;
      gap: 10px;
      margin-top: 8px;
      width: 100%;
    }

    .confirm-btn {
      flex: 1;
      padding: 11px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      min-height: 44px;
      font-family: Poppins, sans-serif;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .confirm-btn:hover { opacity: 0.85; }
    .confirm-btn:active { transform: scale(0.98); }

    .confirm-btn--danger {
      background: rgba(255, 64, 129, 0.85);
      color: #fff;
    }

    .confirm-btn--danger:hover {
      background: #ff4081;
      opacity: 1;
    }

    .confirm-btn--primary {
      background: var(--primary);
      color: #fff;
    }
  `]
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfirmDialogComponent>);

  confirm(): void { this.ref.close(true); }
  cancel(): void  { this.ref.close(false); }
}
