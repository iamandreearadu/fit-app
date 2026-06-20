import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AiInsightDto } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-ai-insight-card',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './ai-insight-card.component.html',
  styleUrl: './ai-insight-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiInsightCardComponent {
  @Input() insight: AiInsightDto | null = null;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  @Output() refresh = new EventEmitter<void>();
}
