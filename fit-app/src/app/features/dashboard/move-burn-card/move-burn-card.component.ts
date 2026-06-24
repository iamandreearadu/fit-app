import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressRingComponent } from '../shared/progress-ring/progress-ring.component';
import { RingMetricDto } from '../../../core/models/dashboard.model';
import { DashboardFacade } from '../../../core/facade/dashboard.facade';

@Component({
  selector: 'app-move-burn-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, ProgressRingComponent],
  templateUrl: './move-burn-card.component.html',
  styleUrl: './move-burn-card.component.css',
})
export class MoveBurnCardComponent {
  protected readonly facade = inject(DashboardFacade);

  /** Expose Math so template can use Math.round() */
  protected readonly Math = Math;
  protected readonly String = String;

  @Input() burned: RingMetricDto | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() openActivityPicker = new EventEmitter<void>();
  @Output() retry              = new EventEmitter<void>();

  /** goal === 0 means backend has no burn target — render as plain counter */
  get isCounterMode(): boolean { return !this.burned || this.burned.goal <= 0; }
  get isEmpty():       boolean { return !this.burned || this.burned.value === 0; }

  get headerSubtitle(): string {
    if (!this.burned) return '';
    if (this.isCounterMode) return `${Math.round(this.burned.value)} kcal burned today`;
    return `${Math.round(this.burned.value)} of ${Math.round(this.burned.goal)} kcal burned`;
  }
}
