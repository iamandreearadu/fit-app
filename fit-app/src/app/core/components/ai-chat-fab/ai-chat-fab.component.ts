import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { AuthenticationStore } from '../../store/auth.store';
import { ModuleContext } from '../../models/groq-ai.model';
import {
  AiChatBottomSheetComponent,
  AiChatSheetData,
} from '../ai-chat-bottom-sheet/ai-chat-bottom-sheet.component';

@Component({
  selector: 'app-ai-chat-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './ai-chat-fab.component.html',
  styleUrl: './ai-chat-fab.component.css',
})
export class AiChatFabComponent {
  private readonly router = inject(Router);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly authStore = inject(AuthenticationStore);
  private readonly destroyRef = inject(DestroyRef);

  /** Additional bottom offset in pixels to avoid overlapping other FABs. */
  @Input() extraBottomOffset = 0;

  readonly sheetOpen = signal(false);

  // ── Reactive URL signal — re-evaluates computed()s on every navigation ────
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  // ── Visibility: authenticated + not on guest routes ───────────────────────
  readonly showFab = computed(() => {
    const url = this.currentUrl() ?? '';
    const isAuth = this.authStore.authUser() !== null;
    const isHiddenRoute =
      url.startsWith('/login') ||
      url.startsWith('/register') ||
      url.startsWith('/onboarding');
    return isAuth && !isHiddenRoute;
  });

  // fabClass reserved for future positional overrides
  readonly fabClass = computed(() => ({}));

  // ── Determine module context from current route ───────────────────────────
  private getModuleContext(): ModuleContext | null {
    const url = this.currentUrl() ?? '';
    if (url.startsWith('/user-dashboard')) return 'dashboard';
    if (url.startsWith('/plans') || url.startsWith('/workout-session')) return 'workouts';
    if (url.includes('nutrition') || url.includes('meal')) return 'nutrition';
    if (url.startsWith('/social')) return 'social';
    return null;
  }

  // ── Open the AI chat bottom sheet ─────────────────────────────────────────
  openChat(): void {
    if (this.sheetOpen()) return;
    const data: AiChatSheetData = { moduleContext: this.getModuleContext() };
    const ref = this.bottomSheet.open(AiChatBottomSheetComponent, {
      panelClass: 'ai-chat-sheet-panel',
      data,
    });
    this.sheetOpen.set(true);
    ref.afterDismissed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sheetOpen.set(false));
  }
}
