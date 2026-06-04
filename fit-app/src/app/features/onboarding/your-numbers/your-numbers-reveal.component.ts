import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OnboardingFacade } from '../../../core/facade/onboarding.facade';
import { YourNumbersResponse } from '../../../core/models/onboarding.model';

@Component({
  selector: 'app-your-numbers-reveal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './your-numbers-reveal.component.html',
  styleUrl: './your-numbers-reveal.component.css',
})
export class YourNumbersRevealComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  protected readonly facade = inject(OnboardingFacade);

  // ── Loading / error state ─────────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly hasError  = signal(false);

  // ── Animated counter display values ──────────────────────────────────────
  readonly tdeeDisplay      = signal('0');
  readonly bmrDisplay       = signal('0');
  readonly bmiDisplay       = signal('0.0');
  readonly goalDisplay      = signal('0');

  // ── Facade numbers proxy (used for goal copy / water / category) ──────────
  readonly numbers = this.facade.yourNumbers;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];

  async ngOnInit(): Promise<void> {
    // If numbers are already in the facade (normal flow from biometrics), animate
    if (this.facade.yourNumbers()) {
      this.startAnimations(this.facade.yourNumbers()!);
      return;
    }

    // Hard refresh fallback — call GET /api/users/me/numbers
    this.isLoading.set(true);
    await this.facade.loadYourNumbers();
    this.isLoading.set(false);

    if (this.facade.yourNumbers()) {
      this.startAnimations(this.facade.yourNumbers()!);
    } else {
      this.hasError.set(true);
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.intervals.forEach(i => clearInterval(i));
  }

  // ── Staggered counter animations ──────────────────────────────────────────
  private startAnimations(n: YourNumbersResponse): void {
    const t0 = setTimeout(() => this.animateValue(n.tdee,        0, v => this.tdeeDisplay.set(v)), 300);
    const t1 = setTimeout(() => this.animateValue(n.bmr,         0, v => this.bmrDisplay.set(v)),  600);
    const t2 = setTimeout(() => this.animateValue(n.bmi,         1, v => this.bmiDisplay.set(v)),  900);
    const t3 = setTimeout(() => this.animateValue(n.goalCalories, 0, v => this.goalDisplay.set(v)), 1200);
    this.timers.push(t0, t1, t2, t3);
  }

  private animateValue(
    target: number,
    decimals: number,
    setter: (v: string) => void,
  ): void {
    const duration  = 1400;
    const steps     = 60;
    const stepMs    = duration / steps;
    const increment = target / steps;
    let current = 0;
    let step    = 0;

    const interval = setInterval(() => {
      step++;
      current = step >= steps ? target : current + increment;
      setter(
        decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString(),
      );
      if (step >= steps) {
        clearInterval(interval);
        this.intervals = this.intervals.filter(i => i !== interval);
      }
    }, stepMs);

    this.intervals.push(interval);
  }

  // ── BMI category badge style ───────────────────────────────────────────────
  bmiCategoryStyle(category: string): Record<string, string> {
    const styles: Record<string, Record<string, string>> = {
      'Underweight':    { background: 'rgba(56,189,248,0.12)',  color: 'var(--color-info)' },
      'Normal weight':  { background: 'rgba(74,222,128,0.10)',  color: 'var(--color-success)' },
      'Overweight':     { background: 'rgba(255,183,77,0.12)',  color: 'var(--color-warning)' },
      'Obese':          { background: 'rgba(255,64,129,0.12)',  color: 'var(--accent)' },
    };
    return styles[category] ?? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' };
  }

  // ── Goal-specific copy ────────────────────────────────────────────────────
  get goalCopy(): string {
    const n = this.numbers();
    if (!n) return '';
    const deficit = Math.abs(Math.round(n.tdee - n.goalCalories));
    switch (n.goal) {
      case 'lose':
        return `To reach your goal, you need a ${deficit.toLocaleString()} kcal daily deficit.`;
      case 'gain':
        return `To build muscle, eat ${deficit.toLocaleString()} kcal above maintenance daily.`;
      default:
        return `Eating ${Math.round(n.dailyCalorieTarget).toLocaleString()} kcal daily keeps you at your current weight.`;
    }
  }

  // ── First action CTAs ─────────────────────────────────────────────────────
  async onStartWorkout(): Promise<void> {
    void this.facade.recordStep('first_action_taken');
    await this.router.navigate(['/plans']);
  }

  async onLogMeal(): Promise<void> {
    void this.facade.recordStep('first_action_taken');
    await this.router.navigate(['/user-profile'], { queryParams: { tab: 'nutrition' } });
  }

  async retry(): Promise<void> {
    this.hasError.set(false);
    this.isLoading.set(true);
    await this.facade.loadYourNumbers();
    this.isLoading.set(false);
    if (this.facade.yourNumbers()) {
      this.startAnimations(this.facade.yourNumbers()!);
    } else {
      this.hasError.set(true);
    }
  }
}
