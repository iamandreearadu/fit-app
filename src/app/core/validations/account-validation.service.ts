import { Injectable } from '@angular/core';
import { Validators, ValidatorFn, ValidationErrors } from '@angular/forms';

export interface LoginValidators {
  email: ValidatorFn[];
  password: ValidatorFn[];
}

export interface RegisterValidators {
  fullName: ValidatorFn[];
  email: ValidatorFn[];
  password: ValidatorFn[];
}

@Injectable({ providedIn: 'root' })
export class AccountValidationService {
  constructor() {}

  public getLoginValidators(): LoginValidators {
    return {
      email: [Validators.required, Validators.email],
      password: [Validators.required, Validators.minLength(6)],
    };
  }

  public getRegisterValidators(): RegisterValidators {
    return {
      fullName: [Validators.required, Validators.minLength(3)],
      email: [Validators.required, Validators.email],
      password: [Validators.required, Validators.minLength(6)],
    };
  }
}
