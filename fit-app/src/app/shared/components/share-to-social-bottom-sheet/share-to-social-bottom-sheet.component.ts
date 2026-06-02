import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { SocialFacade } from '../../../core/facade/social.facade';
import { ShareToSocialData, ShareSheetResult } from '../../../core/models/social.model';

/**
 * Builds client-side post preview — mirrors server logic for instant display.
 *
 * NOTE: intentionally omits setsCompleted — server appends it.
 * Client preview: "🏋️ Title\n⏱️ 47 min · 3 exercises"
 * Server content: "🏋️ Title\n⏱️ 47 min · 3 exercises · 12 sets"
 *
 * The server's SharePostResponse.previewText is the canonical version
 * and is displayed in the success state after publish.
 */
function buildPreviewText(data: ShareToSocialData, caption: string): string {
  const generated =
    data.type === 'workout'
      ? `🏋️ ${data.templateTitle}\n⏱️ ${data.durationMin} min · ${data.exerciseCount} exercises`
      : `🍽️ ${data.mealName}`;
  const trimmed = caption.trim();
  return trimmed ? `${trimmed}\n\n${generated}` : generated;
}

@Component({
  selector: 'app-share-to-social-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './share-to-social-bottom-sheet.component.html',
  styleUrl: './share-to-social-bottom-sheet.component.css',
})
export class ShareToSocialBottomSheetComponent implements OnDestroy {
  readonly data = inject<ShareToSocialData>(MAT_BOTTOM_SHEET_DATA);
  readonly sheetRef = inject(MatBottomSheetRef<ShareToSocialBottomSheetComponent>);
  private readonly facade = inject(SocialFacade);

  // ── State machine ──────────────────────────────────────────────────────────
  readonly state = signal<'active' | 'loading' | 'success' | 'error'>('active');

  // ── Caption ───────────────────────────────────────────────────────────────
  readonly caption = signal('');
  readonly charCount = computed(() => this.caption().length);

  // ── Textarea focus state (signal for OnPush safety) ───────────────────────
  readonly captionFocused = signal(false);

  // ── Live post preview — updates on every caption keystroke ────────────────
  readonly previewText = computed(() => buildPreviewText(this.data, this.caption()));

  // ── Published post ID stored for the success state ────────────────────────
  readonly publishedPostId = signal<number | null>(null);

  // ── Character counter CSS class ───────────────────────────────────────────
  readonly counterClass = computed(() => {
    const n = this.charCount();
    if (n >= 280) return 'char-red';
    if (n >= 240) return 'char-yellow';
    return 'char-green';
  });

  private autoCloseTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
  }

  async onPublish(): Promise<void> {
    if (this.state() === 'loading') return;
    this.state.set('loading');
    this.sheetRef.disableClose = true;

    const caption = this.caption().trim() || undefined;
    const result =
      this.data.type === 'workout'
        ? await this.facade.shareWorkout(this.data.sessionId, caption)
        : await this.facade.shareMeal(this.data.mealId, caption);

    if (!result) {
      // Facade has already shown the error toast; show inline banner too
      this.state.set('error');
      this.sheetRef.disableClose = false;
      return;
    }

    this.publishedPostId.set(result.postId);
    this.state.set('success');
    this.autoCloseTimer = setTimeout(() => {
      this.sheetRef.dismiss({ published: true, postId: result.postId } as ShareSheetResult);
    }, 1500);
  }

  onSkip(): void {
    this.sheetRef.dismiss({ published: false } as ShareSheetResult);
  }

  onClose(): void {
    this.sheetRef.dismiss({ published: false } as ShareSheetResult);
  }
}
