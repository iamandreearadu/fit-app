import { Injectable } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class FormErrorService {

  getMessage(errors: ValidationErrors | null | undefined): string | null {
    if (!errors) return null;

    if (errors['required']) {
      return 'This field is required';
    }

    if (errors['min']) {
      return `Value must be ≥ ${errors['min'].min}`;
    }

    if (errors['max']) {
      return `Value must be ≤ ${errors['max'].max}`;
    }

    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    if (errors['pattern']) {
      return 'Invalid format';
    }

    return 'Invalid value';
  }
}
