import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';

export interface DailyValidators {
  date: any[];
  waterConsumedL: any[];
  steps: any[];
  stepTarget: any[];
  macrosPct: {
    protein: any[];
    carbs: any[];
    fats: any[];
  };
  caloriesBurned: any[];
  caloriesIntake: any[];
  caloriesTotal: any[];
}


@Injectable({
  providedIn: 'root'
})
export class DailyUserDataValidationService {
  constructor() {}

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
