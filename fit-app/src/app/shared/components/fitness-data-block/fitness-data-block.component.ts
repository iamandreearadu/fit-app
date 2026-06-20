import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { animateCounter } from '../../utils/animate-counter';

@Component({
  selector: 'app-fitness-data-block',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './fitness-data-block.component.html',
  styleUrl: './fitness-data-block.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FitnessDataBlockComponent implements OnChanges {
  @Input() icon: string = '';
  @Input() label: string = '';
  @Input() value: number | null = null;
  @Input() unit?: string;
  @Input() trend?: 'up' | 'down' | null = null;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() iconVariant: 'primary' | 'info' | 'success' | 'warning' | 'protein' = 'primary';

  readonly displayValue = signal<number | null>(null);
  private cancelAnimation?: () => void;

  get isLoading(): boolean { return this.value === null; }
  get isZero(): boolean { return this.value === 0; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.cancelAnimation?.();
      const newVal = this.value;
      if (newVal === null) {
        this.displayValue.set(null);
      } else if (newVal === 0) {
        this.displayValue.set(0);
      } else {
        const from = this.displayValue() ?? 0;
        this.cancelAnimation = animateCounter(from, newVal, 600,
          v => this.displayValue.set(v)
        );
      }
    }
  }

  get iconColorVar(): string {
    const m: Record<string, string> = {
      primary: 'var(--nova-primary)',
      info: 'var(--nova-info)',
      success: 'var(--nova-success)',
      warning: 'var(--nova-warning)',
      protein: 'var(--nova-primary-light)',
    };
    return m[this.iconVariant];
  }

  get iconBgVar(): string {
    const m: Record<string, string> = {
      primary: 'var(--nova-primary-alpha-14)',
      info: 'var(--nova-info-bg)',
      success: 'var(--nova-success-bg-12)',
      warning: 'var(--nova-warning-bg)',
      protein: 'var(--nova-primary-alpha-12)',
    };
    return m[this.iconVariant];
  }
}
