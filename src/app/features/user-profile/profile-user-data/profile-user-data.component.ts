import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';
import { UserProfile } from '../../../core/models/user.model';
import { FormErrorService } from '../../../shared/services/form-error.service';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-profile-user-data',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './profile-user-data.component.html',
  styleUrls: ['./profile-user-data.component.css'],
})
export class ProfileUserDataComponent {

  public form: FormGroup;

  public formErrors = inject(FormErrorService);
  public facade = inject(UserFacade);
  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.buildForm();
    this.setupUserEffect();
  }


  // ========== Event handlers ==========

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as Partial<UserProfile>;
    await this.facade.saveUserProfile(payload);
  }

  // ========== helpers ==========

  private buildForm(): FormGroup {
    const v = this.facade.userValidation.getControlValidators();

    return this.fb.group({
      fullName: ['', v.fullName ?? []],
      email: ['', v.email ?? []],
      heightCm: [0, v.heightCm ?? []],
      weightKg: [0, v.weightKg ?? []],
      age: [0, v.age ?? []],
      gender: ['other', v.gender ?? []],
      activity: ['moderate', v.activity ?? []],
      goal: ['maintain', v.goal ?? []],
    });
  }

  private setupUserEffect(): void {
    effect(() => {
      const u = this.facade.user();
      if (!u) return;

      if (this.form.dirty) return;

      this.form.patchValue(u, { emitEvent: false });

    });
  }

}

