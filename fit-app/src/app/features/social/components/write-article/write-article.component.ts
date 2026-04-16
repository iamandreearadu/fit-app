import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { ProfileBlog } from '../../../../core/models/social.model';

export const ARTICLE_CATEGORIES = [
  'Fitness',
  'Nutrition',
  'Wellness',
  'Training',
  'Motivation',
  'Recovery',
  'Mindset',
  'Recipes',
  'Progress',
  'Other',
];

@Component({
  selector: 'app-write-article',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './write-article.component.html',
  styleUrl: './write-article.component.css',
})
export class WriteArticleComponent {
  private readonly facade = inject(SocialFacade);
  private readonly dialogRef = inject(MatDialogRef<WriteArticleComponent>);
  readonly data = inject<{ blog?: ProfileBlog } | null>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.blog;
  readonly categories = ARTICLE_CATEGORIES;

  title = signal(this.data?.blog?.title ?? '');
  caption = signal(this.data?.blog?.caption ?? '');
  description = signal(''); // not in ProfileBlogSummary — starts empty on edit
  category = signal(this.data?.blog?.category ?? '');
  imagePreview = signal<string | null>(this.data?.blog?.image ?? null);
  isDragOver = signal(false);
  isSaving = signal(false);

  readonly step = signal<1 | 2>(1); // step 1 = metadata, step 2 = content

  get titleCount(): number {
    return this.title().length;
  }
  get descCount(): number {
    return this.description().length;
  }

  readonly canPublish = computed(
    () =>
      this.title().trim().length > 0 &&
      this.category().length > 0 &&
      this.description().trim().length > 0,
  );

  // ── Image ──────────────────────────────────────────────────────────────────

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
    if (file?.type.startsWith('image/')) this.readFile(file);
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
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas
          .getContext('2d')!
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        this.imagePreview.set(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }
  removeImage(): void {
    this.imagePreview.set(null);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  nextStep(): void {
    this.step.set(2);
  }
  prevStep(): void {
    this.step.set(1);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async publish(): Promise<void> {
    if (!this.canPublish() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const req = {
        title: this.title().trim(),
        caption: this.caption().trim(),
        description: this.description().trim(),
        category: this.category(),
        image: this.imagePreview() ?? undefined,
      };
      if (this.isEdit && this.data?.blog) {
        await this.facade.updateBlogPost(this.data.blog.id, req);
      } else {
        await this.facade.createBlog(req);
      }
      this.dialogRef.close(true);
    } catch {
      /* silently ignore */
    } finally {
      this.isSaving.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
