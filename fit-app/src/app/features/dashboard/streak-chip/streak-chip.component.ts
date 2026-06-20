import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardStreakDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-streak-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './streak-chip.component.html',
  styleUrl: './streak-chip.component.css',
})
export class StreakChipComponent {
  @Input() streak: DashboardStreakDto | null = null;
  @Input() loading = false;

  get current(): number  { return this.streak?.current ?? 0; }
  get best(): number     { return this.streak?.best    ?? 0; }
  get isActive(): boolean { return this.current > 0; }

  get ariaLabel(): string {
    if (this.loading) return 'Loading streak';
    if (!this.isActive) return 'No active streak';
    return `${this.current} day streak. Personal best: ${this.best} days`;
  }
}
