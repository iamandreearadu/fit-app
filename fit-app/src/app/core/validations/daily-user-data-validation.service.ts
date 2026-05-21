import { Injectable } from '@angular/core';
import { ValidatorFn, Validators } from '@angular/forms';

export interface DailyValidators {
  date: ValidatorFn[];
  waterConsumedL: ValidatorFn[];
  steps: ValidatorFn[];
  stepTarget: ValidatorFn[];
  macrosPct: {
    protein: ValidatorFn[];
    carbs: ValidatorFn[];
    fats: ValidatorFn[];
  };
  caloriesBurned: ValidatorFn[];
  caloriesIntake: ValidatorFn[];
  caloriesTotal: ValidatorFn[];
}


@Injectable({
  providedIn: 'root'
})
export class DailyUserDataValidationService {

  public getControlValidators(): DailyValidators {
    return {
      date: [Validators.required],
      waterConsumedL: [Validators.min(0)],
      steps: [Validators.min(0)],
      stepTarget: [Validators.min(0)],
      macrosPct: {
        protein: [Validators.min(0)],
        carbs: [Validators.min(0)],
        fats: [Validators.min(0)],
      },
      caloriesBurned: [Validators.min(0)],
      caloriesIntake: [Validators.min(0)],
      caloriesTotal: [Validators.min(0)],
    };
  }
}
