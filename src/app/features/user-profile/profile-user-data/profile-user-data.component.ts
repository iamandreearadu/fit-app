import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  standalone: true,
  selector: 'app-profile-user-data',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-user-data.component.html',
  styleUrls: ['./profile-user-data.component.css'],
})
export class ProfileUserDataComponent {
  form: FormGroup;

  constructor(public facade: UserFacade, private fb: FormBuilder) {
    // build form using validators from the facade's validation service
    const v = this.facade.getValidators().getControlValidators();
    this.form = this.fb.group({
      fullName: ['', (v['fullName'] as any) || []],
      email: ['', (v['email'] as any) || []],
      heightCm: [0, (v['heightCm'] as any) || []],
      weightKg: [0, (v['weightKg'] as any) || []],
      age: [0, (v['age'] as any) || []],
      gender: ['other', (v['gender'] as any) || []],
      activity: ['moderate',(v['activity'] as any) || []], 
      goal: ['maintain',(v['goal'] as any) || []], 
    });

    // keep form synced with store user (signals -> form)
    effect(() => {
      const u = this.facade.user();
      if (u) {
        // patch only known fields
        this.form.patchValue({
          fullName: u.fullName ?? '',
          email: u.email ?? '',
          heightCm: u.heightCm ?? 0,
          weightKg: u.weightKg ?? 0,
          age: u.age ?? 0,
          gender: u.gender ?? 'other',
          activity: u.activity ?? 'moderate',
          goal: u.goal ?? 'maintain'
        });
      }
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value as Partial<UserProfile>;
    await this.facade.updateProfile(payload);
  }
}
