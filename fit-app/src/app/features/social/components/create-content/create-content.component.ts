import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TextFieldModule } from '@angular/cdk/text-field';
import { SocialFacade } from '../../../../core/facade/social.facade';
import { CreatePostRequest } from '../../../../core/models/social.model';

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
  selector: 'app-create-content',
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
    TextFieldModule,
  ],
  templateUrl: './create-content.component.html',
  styleUrl: './create-content.component.css',
})
export class CreateContentComponent {
  private readonly facade = inject(SocialFacade);
  private readonly dialogRef = inject(MatDialogRef<CreateContentComponent>);

  // ── Mode toggle ────────────────────────────────────────────────────────────
  mode = signal<'post' | 'article'>('post');

  readonly categories = ARTICLE_CATEGORIES;

  // ── Post signals ───────────────────────────────────────────────────────────
  content = signal('');
  imagePreview = signal<string | null>(null);
  imageBase64 = signal<string | null>(null);
  isSubmitting = signal(false);
  isDragOver = signal(false);

  // ── Article signals ────────────────────────────────────────────────────────
  title = signal('');
  caption = signal('');
  description = signal('');
  category = signal('');
  isSaving = signal(false);
  isDragOverArticle = signal(false);
  articleImagePreview = signal<string | null>(null);

  // ── Post computed ──────────────────────────────────────────────────────────
  get charCount(): number { return this.content().length; }
  get charClass(): string {
    if (this.charCount >= 480) return 'char-red';
    if (this.charCount >= 400) return 'char-yellow';
    return 'char-green';
  }
  get canPost(): boolean {
    return (this.content().trim().length > 0 || !!this.imagePreview()) && this.charCount <= 500;
  }

  // ── Article computed ───────────────────────────────────────────────────────
  get titleCount(): number { return this.title().length; }
  get descCount(): number { return this.description().length; }

  readonly canPublish = computed(() => this.description().trim().length > 0);

  // ── Mode switch ────────────────────────────────────────────────────────────
  setMode(m: 'post' | 'article'): void {
    this.mode.set(m);
  }

  // ── Post image handling ────────────────────────────────────────────────────
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
      this.readPostFile(file);
    }
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.readPostFile(file);
  }

  private readPostFile(file: File): void {
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

  // ── Article image handling ─────────────────────────────────────────────────
  onArticleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOverArticle.set(true);
  }

  onArticleDragLeave(): void {
    this.isDragOverArticle.set(false);
  }

  onArticleDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOverArticle.set(false);
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) this.readArticleFile(file);
  }

  onArticleFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.readArticleFile(file);
  }

  private readArticleFile(file: File): void {
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
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.articleImagePreview.set(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  removeArticleImage(): void {
    this.articleImagePreview.set(null);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async submit(): Promise<void> {
    if (this.mode() === 'post') {
      await this.submitPost();
    } else {
      await this.submitArticle();
    }
  }

  private async submitPost(): Promise<void> {
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

  private async submitArticle(): Promise<void> {
    if (!this.canPublish() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const desc = this.description().trim();
      const req = {
        title: this.title().trim(),
        caption: desc.substring(0, 150),
        description: desc,
        category: this.category(),
        image: this.articleImagePreview() ?? undefined,
      };
      await this.facade.createBlog(req);
      this.dialogRef.close(true);
    } catch {
      // error handled in facade
    } finally {
      this.isSaving.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
