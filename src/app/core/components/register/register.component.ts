import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountFacade } from '../../facade/account.facade';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  fb = inject(FormBuilder);
  facade = inject(AccountFacade);

  private _val = this.facade.getValidators();

  form = this.fb.group({
    fullName: ['', (this._val.getRegisterValidators()['fullName'] as any) || []],
    email: ['', (this._val.getRegisterValidators()['email'] as any) || []],
    password: ['', (this._val.getRegisterValidators()['password'] as any) || []]
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    await this.facade.register(this.form.value as any);
  }
}
