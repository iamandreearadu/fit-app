import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-nutrition-guided-empty',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './nutrition-guided-empty.component.html',
  styleUrl: './nutrition-guided-empty.component.css',
})
export class NutritionGuidedEmptyComponent {
  /** Pass the parent facade's loading state so the skeleton shows on init. */
  @Input() isLoading = false;
  /** Pass true when the meal fetch failed — shows an inline error banner. */
  @Input() hasError = false;
  /** Fires when user taps the AI CTA card. */
  @Output() openAiAnalyzer = new EventEmitter<void>();
  /** Fires when user taps "Add manually". */
  @Output() openManualEntry = new EventEmitter<void>();
}
