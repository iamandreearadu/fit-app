import { Injectable } from '@angular/core';
import { Validators, ValidatorFn } from '@angular/forms';

export interface UserValidators {
  fullName: ValidatorFn[];
  email: ValidatorFn[];
  heightCm: ValidatorFn[];
  weightKg: ValidatorFn[];
  age: ValidatorFn[];
  gender: ValidatorFn[];
  activity: ValidatorFn[];
  goal: ValidatorFn[];
}

@Injectable({
  providedIn: 'root'
})
export class UserValidationService {
  constructor() {}

  public getControlValidators(): UserValidators {
    return {
      fullName: [Validators.required, Validators.minLength(3)],
      email: [Validators.required, Validators.email],

      heightCm: [Validators.required, Validators.min(50), Validators.max(250)],
      weightKg: [Validators.required, Validators.min(20), Validators.max(300)],
      age: [Validators.required, Validators.min(1), Validators.max(120)],

      gender: [],                  // select cu default valid
      activity: [Validators.required],
      goal: [Validators.required],
    };
  }
}
