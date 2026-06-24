import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AiMealAnalyzerComponent } from './ai-meal-analyzer.component';
import { NutritionTabFacade } from '../../../../core/facade/nutrition-tab.facade';
import { AlertService } from '../../../../shared/services/alert.service';
import { MealMacros } from '../../../../core/models/meal-macros';
import { MealType } from '../../../../core/models/nutrition-tab.model';

@Component({
  selector: 'app-ai-meal-analyzer-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, AiMealAnalyzerComponent],
  templateUrl: './ai-meal-analyzer-dialog.component.html',
  styleUrl: './ai-meal-analyzer-dialog.component.css',
})
export class AiMealAnalyzerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AiMealAnalyzerDialogComponent>);
  private readonly nutritionFacade = inject(NutritionTabFacade);
  private readonly alerts = inject(AlertService);

  /**
   * Handles the "Save as meal" action emitted by AiMealAnalyzerComponent.
   * Persists the analyzed macros to the nutrition log then closes the dialog
   * with `true` so the caller knows to reload the meal list.
   */
  async onSaveMeal(event: { macros: MealMacros; mealType: MealType }): Promise<void> {
    const { macros, mealType } = event;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });

    const items =
      macros.items && macros.items.length > 0
        ? macros.items.map(it => ({
            name: it.name,
            grams: 0,
            calories: it.calories_kcal ?? 0,
            protein_g: it.protein_g ?? 0,
            carbs_g: it.carbs_g ?? 0,
            fats_g: it.fats_g ?? 0,
          }))
        : [
            {
              name: 'AI Meal',
              grams: 0,
              calories: macros.calories_kcal ?? 0,
              protein_g: macros.protein_g,
              carbs_g: macros.carbs_g,
              fats_g: macros.fats_g,
            },
          ];

    try {
      await this.nutritionFacade.saveMeal({
        name: `AI Meal ${timeStr}`,
        type: mealType,
        date: new Date().toISOString().slice(0, 10),
        items,
      });
      this.alerts.success('Meal saved to your nutrition log.');
      this.dialogRef.close(true);
    } catch {
      this.alerts.error('Failed to save meal. Please try again.');
    }
  }

  /**
   * Handles the "Add to Today" action — no nutrition log entry is created in
   * this context, so we close the dialog without triggering a list reload.
   */
  onAdded(): void {
    this.dialogRef.close(false);
  }

  /** Surfaces analyzer errors as toasts; dialog stays open so the user can retry. */
  onError(msg: string): void {
    this.alerts.error(msg || 'AI analysis failed.');
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
