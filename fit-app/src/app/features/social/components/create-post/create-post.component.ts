import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { CreatePostRequest } from '../../../../core/models/social.model';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css'
})
export class CreatePostComponent {
  private readonly facade = inject(SocialFacade);
  private readonly dialogRef = inject(MatDialogRef<CreatePostComponent>);

  content = signal('');
  imagePreview = signal<string | null>(null);
  imageBase64 = signal<string | null>(null);
  isSubmitting = signal(false);
  isDragOver = signal(false);

  get charCount(): number { return this.content().length; }
  get charClass(): string {
    if (this.charCount >= 480) return 'char-red';
    if (this.charCount >= 400) return 'char-yellow';
    return 'char-green';
  }
  get canPost(): boolean {
    return (this.content().trim().length > 0 || !!this.imagePreview()) && this.charCount <= 500;
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.readFile(file);
    }
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.readFile(file);
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_PX = 1200;
        const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        this.imagePreview.set(compressed);
        this.imageBase64.set(compressed.split(',')[1]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.imageBase64.set(null);
  }

  async submit(): Promise<void> {
    if (!this.canPost || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      const req: CreatePostRequest = { content: this.content().trim() };
      if (this.imagePreview()) {
        req.imageUrl = this.imagePreview()!;
      }
      await this.facade.createPost(req);
      this.dialogRef.close(true);
    } catch {
      // error handled in facade
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
