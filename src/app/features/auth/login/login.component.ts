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
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  public facade = inject(AccountFacade);
  public formErrors = inject(FormErrorService);

  private validators = this.facade.authValidation.getLoginValidators();

  form = this.fb.group({
    email: ['', this.validators.email],
    password: ['', this.validators.password],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const creds = this.form.getRawValue() as AuthCredentials;

    const ok = await this.facade.login(creds);

    if (ok) {
      await this.router.navigate(['']);
    } else {
      this.form.reset();
    }
  }
}
