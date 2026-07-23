import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AccountService } from '../../../api/account.service';
import { MaterialModule } from '../../../core/material/material.module';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../auth-shell.css', './reset-password.component.css'],
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly account = inject(AccountService);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token')?.trim() ?? '';

  readonly loading = signal(false);
  readonly complete = signal(false);
  readonly invalidLink = signal(!this.token);
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  async submit(): Promise<void> {
    if (!this.token) {
      this.invalidLink.set(true);
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.invalidLink.set(false);
    try {
      await this.account.resetPassword(this.token, this.form.controls.password.value);
      this.complete.set(true);
    } catch {
      this.invalidLink.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
