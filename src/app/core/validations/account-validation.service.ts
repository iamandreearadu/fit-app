import { Injectable } from '@angular/core';
import { Validators, ValidatorFn, ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class AccountValidationService {
  constructor() {}

  getLoginValidators(): Record<string, ValidatorFn[]> {
    return {
      email: [Validators.required, Validators.email],
      password: [Validators.required, Validators.minLength(6)]
    };
  }

  getRegisterValidators(): Record<string, ValidatorFn[]> {
    return {
      fullName: [Validators.required, Validators.minLength(3)],
      email: [Validators.required, Validators.email],
      password: [Validators.required, Validators.minLength(6)]
    };
  }

  getErrorMessage(controlName: string, errors: ValidationErrors | null | undefined): string | null {
    if (!errors) return null;
    if (errors['required']) return 'This field is required';
    if (errors['minlength']) return `Minimum length is ${errors['minlength'].requiredLength}`;
    if (errors['email']) return 'Invalid email address';
    return 'Invalid value';
  }
}
