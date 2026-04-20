import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { SocialFacade } from '../../../../core/facade/social.facade';

@Component({
  selector: 'app-edit-bio',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule
  ],
  templateUrl: './edit-bio.component.html',
  styleUrl: './edit-bio.component.css'
})
export class EditBioComponent {
  private readonly facade = inject(SocialFacade);
  private readonly dialogRef = inject(MatDialogRef<EditBioComponent>);
  private readonly toastr = inject(ToastrService);
  readonly data = inject<{ bio: string | null }>(MAT_DIALOG_DATA);

  bio = signal<string>(this.data.bio ?? '');
  isSaving = signal(false);

  get charCount(): number { return this.bio().length; }
  get charClass(): string {
    if (this.charCount >= 180) return 'char-red';
    if (this.charCount >= 140) return 'char-yellow';
    return 'char-green';
  }

  async save(): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const val = this.bio().trim();
      await this.facade.updateBio(val.length > 0 ? val : null);
      this.toastr.success('Bio updated');
      this.dialogRef.close(true);
    } catch (err) {
      console.error('Bio save failed:', err);
      this.toastr.error('Could not save bio. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  close(): void { this.dialogRef.close(false); }
}
