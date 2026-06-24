import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

export type BarColorClass = 'protein' | 'carbs' | 'fat';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBarModule, MatIconModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.css',
})
export class ProgressBarComponent {
  @Input() name       = '';
  @Input() consumed   = 0;
  @Input() target     = 0;
  @Input() unit       = 'g';
  @Input() colorClass: BarColorClass = 'protein';
  @Input() loading    = false;
  @Input() error      = false;

  get percentage(): number {
    if (!this.target || this.target <= 0) return 0;
    return Math.min(100, Math.round((this.consumed / this.target) * 100));
  }

  get ariaLabel(): string {
    return `${this.name}: ${this.consumed}${this.unit} of ${this.target}${this.unit}`;
  }
}
