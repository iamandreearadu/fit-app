import { Injectable } from '@angular/core';
import { Validators, ValidatorFn, ValidationErrors } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class DailyUserDataValidationService {
  constructor() {}

  getControlValidators(): Record<string, any> {
    return {
      date: [Validators.required],
      waterConsumedL: [Validators.min(0)],
      steps: [Validators.min(0)],
      stepTarget: [Validators.min(0)],
      macrosPct: {
        protein: [Validators.min(0), Validators.max(100)],
        carbs: [Validators.min(0), Validators.max(100)],
        fats: [Validators.min(0), Validators.max(100)],
      },
      caloriesBurned: [Validators.min(0)]
    };
  }

  getErrorMessage(controlName: string, errors: ValidationErrors | null | undefined): string | null {
    if (!errors) return null;
    if (errors['required']) return 'This field is required';
    if (errors['min']) return `Value must be >= ${errors['min'].min}`;
    if (errors['max']) return `Value must be <= ${errors['max'].max}`;
    return 'Invalid value';
  }
}
