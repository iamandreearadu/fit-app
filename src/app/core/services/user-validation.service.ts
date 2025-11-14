import { Injectable } from '@angular/core';
import { Validators, ValidatorFn, ValidationErrors } from '@angular/forms';

@Injectable({ 
  providedIn: 'root' 
})

export class UserValidationService {
  constructor() {}

  getControlValidators(): Record<string, ValidatorFn[]> {
    return {
      fullName: [Validators.required, Validators.minLength(3)],
      email: [Validators.required, Validators.email],
      heightCm: [Validators.min(0)],
      weightKg: [Validators.min(0)],
      age: [Validators.min(0), Validators.max(130)],
      gender: [],
      activity: [Validators.required],
      goal: [Validators.required]
    };
  }

  getErrorMessage(
    controlName: string,
    errors: ValidationErrors | null
  ): string | null {
    if (!errors) return null;
    if (errors['required']) return 'This field is required';
    if (errors['minlength'])
      return `Minimum length is ${errors['minlength'].requiredLength}`;
    if (errors['email']) return 'Invalid email address';
    if (errors['min']) return `Value must be >= ${errors['min'].min}`;
    if (errors['max']) return `Value must be <= ${errors['max'].max}`;
    return 'Invalid value';
  }
}
