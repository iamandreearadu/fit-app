import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { GroqAiFacade } from '../../facade/groq-ai.facade';
import { ModuleContext } from '../../models/groq-ai.model';

export interface AiChatSheetData {
  moduleContext: ModuleContext | null;
}

interface CtxConfig {
  icon: string;
  label: string;
  cls: string;
}

interface ChipSuggestion {
  text: string;
}

@Component({
  selector: 'app-ai-chat-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './ai-chat-bottom-sheet.component.html',
  styleUrl: './ai-chat-bottom-sheet.component.css',
})
export class AiChatBottomSheetComponent implements OnDestroy {
  readonly data = inject<AiChatSheetData>(MAT_BOTTOM_SHEET_DATA);
  readonly sheetRef = inject(MatBottomSheetRef<AiChatBottomSheetComponent>);
  protected readonly facade = inject(GroqAiFacade);
  private readonly router = inject(Router);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  // ── Input ──────────────────────────────────────────────────────────────────
  readonly prompt = signal('');
  readonly charCount = computed(() => this.prompt().length);

  // ── Context badge config ───────────────────────────────────────────────────
  readonly ctxConfig = computed((): CtxConfig => {
    const map: Record<string, CtxConfig> = {
      dashboard: { icon: 'grid_view',      label: 'Asking about your dashboard',      cls: 'ctx--dashboard' },
      workouts:  { icon: 'fitness_center', label: 'Asking about your workouts',       cls: 'ctx--workouts'  },
      nutrition: { icon: 'restaurant',     label: 'Asking about your nutrition',      cls: 'ctx--nutrition' },
      social:    { icon: 'people',         label: 'Asking about fitness & community', cls: 'ctx--social'    },
    };
    return map[this.data.moduleContext ?? ''] ?? { icon: 'auto_awesome', label: 'AI Assistant', cls: 'ctx--default' };
  });

  // ── Suggestion chips per context ───────────────────────────────────────────
  readonly suggestions = computed((): ChipSuggestion[] => {
    const ctx = this.data.moduleContext;
    const map: Record<string, ChipSuggestion[]> = {
      workouts:  [
        { text: 'What should I focus on next?' },
        { text: 'Am I overtraining?' },
        { text: 'How do I improve my form?' },
      ],
      nutrition: [
        { text: 'How am I doing on protein today?' },
        { text: 'What should I eat for dinner?' },
        { text: 'Am I hitting my macro goals?' },
      ],
      dashboard: [
        { text: 'How is my streak going?' },
        { text: 'What did I achieve this week?' },
        { text: 'Should I train today?' },
      ],
      social: [
        { text: 'How do I stay motivated?' },
        { text: 'What\'s a good training frequency?' },
        { text: 'Tips for tracking progress?' },
      ],
    };
    return map[ctx ?? ''] ?? [
      { text: 'How do I build a workout plan?' },
      { text: 'What should I eat after training?' },
      { text: 'How many calories do I need?' },
    ];
  });

  constructor() {
    // Auto-scroll to bottom after each new message or loading state change
    effect(() => {
      this.facade.messages(); // track signal
      this.facade.loading();  // also scroll when typing indicator appears
      queueMicrotask(() => {
        const el = this.messagesContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  ngOnDestroy(): void {
    // intentionally left blank — no subscriptions to clean up
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async send(): Promise<void> {
    const text = this.prompt().trim();
    if (!text || this.facade.loading()) return;
    this.prompt.set('');
    await this.facade.askAI(text, undefined, undefined, this.data.moduleContext ?? undefined);
  }

  // ── Suggestion chip tap ────────────────────────────────────────────────────
  useSuggestion(text: string): void {
    this.prompt.set(text);
  }

  // ── Enter key handling ─────────────────────────────────────────────────────
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ── Navigate to full history view ──────────────────────────────────────────
  goToHistory(): void {
    this.sheetRef.dismiss();
    this.router.navigate(['/ai-assistant']);
  }

  // ── Format timestamp ──────────────────────────────────────────────────────
  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
