import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountFacade } from '../../../core/facade/account.facade';
import { FormErrorService } from '../../../shared/services/form-error.service';
import { AuthCredentials } from '../../../core/models/auth-credentials.model';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  public facade = inject(AccountFacade);
  public formErrors = inject(FormErrorService);

  private validators = this.facade.authValidation.getRegisterValidators();

  form = this.fb.group({
    fullName: ['', this.validators.fullName],
    email: ['', this.validators.email],
    password: ['', this.validators.password],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const creds = this.form.getRawValue() as AuthCredentials & { fullName?: string };

    const ok = await this.facade.register(creds);

    if (ok) {
      await this.router.navigate(['/user-dashboard']);
    } else {
      this.form.reset();
    }
  }
}
