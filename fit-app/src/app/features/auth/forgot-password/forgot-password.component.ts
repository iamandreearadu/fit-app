import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountService } from '../../../api/account.service';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../auth-shell.css', './forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly account = inject(AccountService);

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly requestError = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.requestError.set(false);
    try {
      await this.account.requestPasswordReset(this.form.controls.email.value);
      this.sent.set(true);
    } catch {
      this.requestError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  tryAnotherEmail(): void {
    this.sent.set(false);
    this.requestError.set(false);
  }
}
