import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-private-stats',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './private-stats.component.html',
  styleUrl: './private-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateStatsComponent {
  @Input() bmiTrend: 'up' | 'down' | 'stable' = 'stable';
  @Input() weightHistory: number[] = [];
  @Input() goalProgressPct: number = 0;
  @Input() goalLabel: string = 'Goal Progress';
  @Input() loading: boolean = false;

  get hasSparkline(): boolean {
    return this.weightHistory.length >= 2;
  }

  get sparklinePoints(): string {
    if (this.weightHistory.length < 2) return '';
    const w = 120;
    const h = 40;
    const min = Math.min(...this.weightHistory);
    const max = Math.max(...this.weightHistory);
    const range = max - min || 1;
    return this.weightHistory
      .map((v, i) => {
        const x = (i / (this.weightHistory.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      })
      .join(' ');
  }

  get sparklineFillPath(): string {
    if (this.weightHistory.length < 2) return '';
    const w = 120;
    const h = 40;
    const min = Math.min(...this.weightHistory);
    const max = Math.max(...this.weightHistory);
    const range = max - min || 1;

    const points = this.weightHistory.map((v, i) => {
      const x = (i / (this.weightHistory.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    });

    const firstX = 0;
    const lastX = w;
    return `M ${points[0]} L ${points.slice(1).join(' L ')} L ${lastX},${h} L ${firstX},${h} Z`;
  }
}
