import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [],
  templateUrl: './progress-ring.component.html',
  styleUrl: './progress-ring.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRingComponent {
  readonly Math = Math;

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() progress: number = 0;
  @Input() variant: 'calories' | 'protein' | 'water' | 'workouts' = 'calories';
  @Input() label?: string;
  @Input() loading: boolean = false;

  readonly gradId = `ring-grad-${Math.random().toString(36).slice(2, 7)}`;

  get diameter(): number { return ({ sm: 44, md: 72, lg: 108 } as Record<string, number>)[this.size]; }
  get strokeWidth(): number { return ({ sm: 3, md: 4, lg: 5 } as Record<string, number>)[this.size]; }
  get r(): number { return this.diameter / 2 - this.strokeWidth / 2; }
  get cx(): number { return this.diameter / 2; }
  get cy(): number { return this.diameter / 2; }
  get circumference(): number { return 2 * Math.PI * this.r; }
  get clampedProgress(): number { return Math.min(Math.max(this.progress, 0), 1); }
  get isComplete(): boolean { return this.progress >= 1; }
  get dashOffset(): number { return this.circumference * (1 - this.clampedProgress); }
  get progressPct(): number { return Math.round(this.clampedProgress * 100); }

  get arcColor(): string {
    const m: Record<string, string> = {
      calories: 'var(--nova-primary)',
      protein: 'var(--nova-primary-light)',
      water: 'var(--nova-info)',
      workouts: 'var(--nova-success)',
    };
    return m[this.variant];
  }
  get gradStart(): string {
    const m: Record<string, string> = {
      calories: '#7c4dff',
      protein: '#a78bfa',
      water: '#4ade80',
      workouts: '#4ade80',
    };
    return m[this.variant];
  }
  get gradEnd(): string {
    const m: Record<string, string> = {
      calories: '#5e35b1',
      protein: '#7c4dff',
      water: '#22d3ee',
      workouts: '#38bdf8',
    };
    return m[this.variant];
  }
}
