import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { UserFacade } from '../../../core/facade/user.facade';
import { FormErrorService } from '../../../shared/services/form-error.service';

@Component({
  standalone: true,
  selector: 'app-profile-tab',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './profile-tab.component.html',
  styleUrl: './profile-tab.component.css'
})
export class ProfileTabComponent implements OnInit {
  public form: FormGroup;
  public facade = inject(UserFacade);
  public formErrors = inject(FormErrorService);
  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    const user = this.facade.user();
    if (user) {
      this.form.patchValue({
        fullName: user.fullName || '',
        email: user.email || ''
      });
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const patch = this.form.getRawValue();
    await this.facade.saveUserProfile(patch);
  }
}
