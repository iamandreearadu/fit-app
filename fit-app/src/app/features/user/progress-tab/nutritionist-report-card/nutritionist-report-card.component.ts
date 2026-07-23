import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NutritionistWeeklyReportDto } from '../../../../core/models/progress.model';

@Component({
  selector: 'app-nutritionist-report-card',
  standalone: true,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './nutritionist-report-card.component.html',
  styleUrl: './nutritionist-report-card.component.css',
})
export class NutritionistReportCardComponent {
  @Input() report: NutritionistWeeklyReportDto | null = null;
  @Input() streak = 0;
  @Input() refreshing = false;
  @Output() refreshReport = new EventEmitter<void>();
}
