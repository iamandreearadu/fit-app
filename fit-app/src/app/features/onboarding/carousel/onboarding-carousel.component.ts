import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingFacade } from '../../../core/facade/onboarding.facade';

@Component({
  selector: 'app-onboarding-carousel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './onboarding-carousel.component.html',
  styleUrl: './onboarding-carousel.component.css',
})
export class OnboardingCarouselComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  protected readonly facade = inject(OnboardingFacade);

  // ── Slide state ───────────────────────────────────────────────────────────
  readonly currentSlide = signal(0);
  readonly isTransitioning = signal(false);

  // ── AI chat animation (slide 2) ───────────────────────────────────────────
  readonly aiResponseVisible = signal(false);
  private aiTimer?: ReturnType<typeof setTimeout>;
  private transitionTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.aiTimer) clearTimeout(this.aiTimer);
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  goToSlide2(): void {
    if (this.isTransitioning()) return;
    this.isTransitioning.set(true);
    this.transitionTimer = setTimeout(() => {
      this.currentSlide.set(1);
      this.isTransitioning.set(false);
      // Start AI response animation 2.5s after slide 2 appears
      this.aiTimer = setTimeout(() => this.aiResponseVisible.set(true), 2500);
    }, 300);
  }

  async getStarted(): Promise<void> {
    // Fire-and-forget: record carousel_seen (non-blocking)
    void this.facade.recordStep('carousel_seen');
    await this.router.navigate(['/onboarding/biometrics']);
  }

  async skip(): Promise<void> {
    void this.facade.recordStep('carousel_seen');
    await this.router.navigate(['/onboarding/biometrics']);
  }
}
