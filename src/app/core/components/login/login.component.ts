import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountFacade } from '../../facade/account.facade';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  fb = inject(FormBuilder);
  facade = inject(AccountFacade);

  private _val = this.facade.getValidators();

  form = this.fb.group({
    email: ['', (this._val.getLoginValidators()['email'] as any) || []],
    password: ['', (this._val.getLoginValidators()['password'] as any) || []]
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // form.value has a loose type; cast to expected credentials
    await this.facade.login(this.form.value as any);
  }
}
