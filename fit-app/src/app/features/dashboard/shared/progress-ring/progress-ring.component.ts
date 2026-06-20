import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
} from '@angular/core';

export type RingSize      = 'sm' | 'md' | 'lg';
export type RingColorMode = 'primary' | 'gradient' | 'info' | 'success';

/** Unique counter so each ring gets its own SVG gradient ID. */
let _ringCounter = 0;

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-ring.component.html',
  styleUrl: './progress-ring.component.css',
})
export class ProgressRingComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() value     = 0;
  @Input() goal      = 0;
  @Input() label     = '';
  @Input() sublabel  = '';
  @Input() unit      = '';
  @Input() size: RingSize           = 'md';
  @Input() colorMode: RingColorMode = 'primary';
  @Input() loading   = false;

  /** Unique ID suffix for SVG gradient element. */
  readonly gradientId = `rg-${++_ringCounter}`;

  /** Signal that drives the animated dashoffset. */
  readonly _animDashoffset = signal<number>(0);

  // ── Geometry ──────────────────────────────────────────────────────────
  get diameter(): number {
    return { sm: 120, md: 160, lg: 200 }[this.size];
  }
  get strokeWidth(): number {
    return { sm: 8, md: 10, lg: 12 }[this.size];
  }
  get radius(): number {
    return (this.diameter - this.strokeWidth) / 2;
  }
  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }
  get cx(): number { return this.diameter / 2; }
  get cy(): number { return this.diameter / 2; }

  get rotateTransform(): string {
    return `rotate(-90 ${this.cx} ${this.cy})`;
  }

  // ── Color ─────────────────────────────────────────────────────────────
  get strokeColor(): string {
    switch (this.colorMode) {
      case 'gradient': return `url(#${this.gradientId})`;
      case 'info':     return '#38bdf8';
      case 'success':  return '#4ade80';
      default:         return '#7c4dff';
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────
  get percentage(): number {
    if (!this.goal || this.goal <= 0) return 0;
    return Math.min(1, Math.max(0, this.value / this.goal));
  }
  get computedDashoffset(): number {
    return this.circumference * (1 - this.percentage);
  }

  // ── Aria label ────────────────────────────────────────────────────────
  get ariaLabel(): string {
    if (this.loading) return `Loading ${this.label}`;
    if (!this.goal || this.goal <= 0) {
      return `${this.label}: ${this.value} ${this.unit}`;
    }
    return `${this.label}: ${this.value} ${this.unit} of ${this.goal} ${this.unit} goal`;
  }

  // ── Animation ─────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    const loadingChanged = 'loading' in changes;
    const valueChanged   = 'value' in changes || 'goal' in changes;

    if (loadingChanged) {
      const wasLoading = changes['loading'].previousValue as boolean | undefined;
      const isLoading  = changes['loading'].currentValue as boolean;

      if (isLoading) {
        // Reset arc while loading
        this._animDashoffset.set(this.circumference);
      } else if (wasLoading) {
        // Loading just finished — animate from empty → real value
        this._animDashoffset.set(this.circumference); // start empty
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this._animDashoffset.set(this.computedDashoffset);
            this.cdr.markForCheck();
          });
        });
        return; // skip the valueChanged branch this tick
      }
    }

    if (valueChanged && !this.loading) {
      this._animDashoffset.set(this.computedDashoffset);
    }
  }
}
