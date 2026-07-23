import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingFacade } from '../../../core/facade/onboarding.facade';

interface GuideFeature {
  icon: string;
  title: string;
  description: string;
}

interface GuideSlide {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  icon: string;
  features: GuideFeature[];
}

const GUIDE_SLIDES: GuideSlide[] = [
  {
    eyebrow: 'Your daily command center',
    title: 'Build consistency,',
    accent: 'one day at a time.',
    description: 'Dashboard brings today’s activity, nutrition, hydration, steps, calories and complete-day streak into one calm view.',
    icon: 'dashboard',
    features: [
      { icon: 'restaurant', title: 'Today’s Meals', description: 'Review and manage every meal logged today.' },
      { icon: 'water_drop', title: 'Daily habits', description: 'Track water, steps and activity from one place.' },
      { icon: 'history', title: 'Previous days', description: 'Open recent days and review meals and daily totals.' },
      { icon: 'local_fire_department', title: 'Real streak', description: 'A day counts when meals, activity, steps and water are complete.' },
    ],
  },
  {
    eyebrow: 'Nutrition that stays practical',
    title: 'Log food your way,',
    accent: 'with or without AI.',
    description: 'Use a photo, barcode, saved meal or manual macros. Everything added to today stays synchronized with Dashboard totals.',
    icon: 'auto_awesome',
    features: [
      { icon: 'add_a_photo', title: 'AI Meal Analyzer', description: 'Identify foods and estimate calories and macros from a photo.' },
      { icon: 'qr_code_scanner', title: 'Barcode scan', description: 'Use packaged-food information when available.' },
      { icon: 'bookmark', title: 'Saved meals', description: 'Reuse meals from Account → Nutrition and assign a meal type.' },
      { icon: 'edit_note', title: 'Manual macros', description: 'Add only to today or explicitly save the meal for later.' },
    ],
  },
  {
    eyebrow: 'Training, from plan to completion',
    title: 'Create workouts,',
    accent: 'then record the work.',
    description: 'Build reusable routines in Account, start a live session and keep completed training connected to your activity history.',
    icon: 'fitness_center',
    features: [
      { icon: 'library_add', title: 'Workout templates', description: 'Create reusable workouts with exercises, sets, reps and weight.' },
      { icon: 'timer', title: 'Active session', description: 'Follow the workout and record completed sets in real time.' },
      { icon: 'visibility', title: 'Profile visibility', description: 'Choose which workouts other users can see.' },
      { icon: 'add_to_photos', title: 'Attach to posts', description: 'Add a saved workout as context when publishing a post.' },
    ],
  },
  {
    eyebrow: 'Patterns, not vanity metrics',
    title: 'Understand progress',
    accent: 'across real weeks.',
    description: 'Progress combines complete days, trends and a weekly nutrition report while keeping sensitive health data private.',
    icon: 'monitoring',
    features: [
      { icon: 'insights', title: '7 and 30-day trends', description: 'Compare meaningful patterns instead of isolated daily values.' },
      { icon: 'auto_awesome', title: 'Weekly report', description: 'Get a realistic nutrition summary aligned with your physical goal.' },
      { icon: 'scale', title: 'Weight check-ins', description: 'Track measured change privately in your own account.' },
      { icon: 'lock', title: 'Privacy by design', description: 'Weight, calories, hydration and nutrition remain private.' },
    ],
  },
  {
    eyebrow: 'Your fitness community',
    title: 'Share the journey,',
    accent: 'keep control of it.',
    description: 'Publish posts, connect activity, discover people and manage what appears on your profile.',
    icon: 'groups',
    features: [
      { icon: 'grid_on', title: 'Posts and profile', description: 'Browse posts in a clean grid and open only what interests you.' },
      { icon: 'share', title: 'Share posts', description: 'Send a post to another NovaFit user or copy its link.' },
      { icon: 'bookmark', title: 'Save and archive', description: 'Keep useful posts and manage your own archive.' },
      { icon: 'chat_bubble', title: 'Messages', description: 'Chat with users and send images or shared-post previews.' },
    ],
  },
  {
    eyebrow: 'Help when you need it',
    title: 'Ask the AI assistant,',
    accent: 'keep the context.',
    description: 'Start focused conversations about fitness, nutrition and training, then return to any conversation from your history.',
    icon: 'smart_toy',
    features: [
      { icon: 'forum', title: 'Multiple conversations', description: 'Separate topics and reopen previous discussions.' },
      { icon: 'fitness_center', title: 'Fitness guidance', description: 'Ask for workout structure, recovery ideas and explanations.' },
      { icon: 'restaurant_menu', title: 'Nutrition guidance', description: 'Discuss macros, meal structure and practical choices.' },
      { icon: 'warning_amber', title: 'Use good judgment', description: 'AI guidance is informational, not medical advice.' },
    ],
  },
  {
    eyebrow: 'Make NovaFit yours',
    title: 'Everything stays',
    accent: 'organized in Account.',
    description: 'Update your profile and physical details, manage workouts and meals, review progress, goals, settings and notifications.',
    icon: 'manage_accounts',
    features: [
      { icon: 'person', title: 'My Account', description: 'Manage identity, profile information and account preferences.' },
      { icon: 'straighten', title: 'Physical details', description: 'Keep the measurements used for personal calculations current.' },
      { icon: 'flag', title: 'Goals', description: 'Align metrics and reports with lose, maintain or gain goals.' },
      { icon: 'settings', title: 'Settings', description: 'Control your experience and notification preferences.' },
    ],
  },
];

@Component({
  selector: 'app-onboarding-carousel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './onboarding-carousel.component.html',
  styleUrl: './onboarding-carousel.component.css',
})
export class OnboardingCarouselComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(OnboardingFacade);

  readonly slides = GUIDE_SLIDES;
  readonly currentSlide = signal(0);
  readonly isGuideMode = this.route.snapshot.queryParamMap.get('mode') === 'guide';

  get slide(): GuideSlide {
    return this.slides[this.currentSlide()];
  }

  goTo(index: number): void {
    this.currentSlide.set(Math.max(0, Math.min(index, this.slides.length - 1)));
  }

  previous(): void {
    this.goTo(this.currentSlide() - 1);
  }

  async next(): Promise<void> {
    if (this.currentSlide() < this.slides.length - 1) {
      this.goTo(this.currentSlide() + 1);
      return;
    }
    await this.finish();
  }

  async exit(): Promise<void> {
    if (this.isGuideMode) {
      await this.router.navigate(['/user-dashboard']);
      return;
    }
    void this.facade.recordStep('carousel_seen');
    await this.router.navigate(['/onboarding/biometrics']);
  }

  private async finish(): Promise<void> {
    await this.exit();
  }
}
