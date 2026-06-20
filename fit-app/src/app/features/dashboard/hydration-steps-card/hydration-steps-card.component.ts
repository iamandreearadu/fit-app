import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressRingComponent } from '../shared/progress-ring/progress-ring.component';
import { RingMetricDto } from '../../../core/models/dashboard.model';
import { DashboardFacade } from '../../../core/facade/dashboard.facade';

@Component({
  selector: 'app-hydration-steps-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, ProgressRingComponent],
  templateUrl: './hydration-steps-card.component.html',
  styleUrl: './hydration-steps-card.component.css',
})
export class HydrationStepsCardComponent {
  protected readonly facade = inject(DashboardFacade);
  protected readonly Math = Math;

  @Input() water: RingMetricDto | null = null;
  @Input() steps: RingMetricDto | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() retry = new EventEmitter<void>();

  // Confirmation signals for quick-add chips
  readonly waterConfirming = signal<number | null>(null);
  readonly stepsConfirming = signal<number | null>(null);

  get waterLabel(): string {
    if (!this.water) return '0ml';
    const v = this.water.value;
    return v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${Math.round(v)}ml`;
  }

  get waterSublabel(): string {
    if (!this.water) return '';
    if (this.water.value >= this.water.goal && this.water.goal > 0) return 'Goal reached! 💧';
    return `of ${(this.water.goal / 1000).toFixed(1)}L goal`;
  }

  get stepsLabel(): string {
    if (!this.steps) return '0';
    return Math.round(this.steps.value).toLocaleString();
  }

  get stepsSublabel(): string {
    if (!this.steps) return '';
    if (this.steps.value >= this.steps.goal && this.steps.goal > 0) return 'Goal reached! 🏆';
    const k = (this.steps.goal / 1000).toFixed(0);
    return `of ${k}k steps`;
  }

  get headerSubtitle(): string {
    const w = this.water ? `${Math.round(this.water.value)} ml` : '0 ml';
    const s = this.steps ? Math.round(this.steps.value).toLocaleString() : '0';
    return `${w} · ${s} steps`;
  }

  addWater(ml: number): void {
    this.facade.adjustWaterMl(ml);
    this.waterConfirming.set(ml);
    setTimeout(() => this.waterConfirming.set(null), 1200);
  }

  addSteps(delta: number): void {
    this.facade.adjustSteps(delta);
    this.stepsConfirming.set(delta);
    setTimeout(() => this.stepsConfirming.set(null), 1200);
  }
}
