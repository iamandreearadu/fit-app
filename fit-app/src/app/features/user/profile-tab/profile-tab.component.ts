import { Component, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { UserFacade } from '../../../core/facade/user.facade';
import { FormErrorService } from '../../../shared/services/form-error.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  standalone: true,
  selector: 'app-profile-tab',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './profile-tab.component.html',
  styleUrl: './profile-tab.component.css'
})
export class ProfileTabComponent implements OnInit {
  public form: FormGroup;
  public facade = inject(UserFacade);
  public formErrors = inject(FormErrorService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);


  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('imagePreviewTpl') imagePreviewTpl!: TemplateRef<unknown>;

  private readonly maxImageSizeBytes = 1.5 * 1024 * 1024; 


  constructor() {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    const user = this.facade.user();
    if (user) {
      this.form.patchValue({
        fullName: user.fullName || '',
        email: user.email || '',
        imageUrl: user.imageUrl || '',
      });
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
       imageUrl: [''] 
    });
  }

  openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > this.maxImageSizeBytes) {
      alert('Image too large. Please choose an image under ~1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => alert('Failed to read file.');
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) {
        alert('Invalid image data.');
        return;
      }
      this.form.patchValue({ imageUrl: dataUrl });
      this.form.markAsDirty();
    };
    reader.readAsDataURL(file);
  }

  onClearLink(): void {
    this.form.patchValue({ imageUrl: '' });
    this.form.markAsDirty();
  }


  openImagePreview(): void {
    const src = (this.form.get('imageUrl')?.value || '').trim();
    if (!src) return; 
    this.dialog.open(this.imagePreviewTpl, {
      maxWidth: '95vw',
      width: '95vw',
      panelClass: 'image-preview-dialog-panel' 
    });
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const patch = this.form.getRawValue();
    await this.facade.saveUserProfile(patch);
  }
}
