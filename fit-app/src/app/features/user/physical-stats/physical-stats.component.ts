import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { UserFacade } from '../../../core/facade/user.facade';
import { FormErrorService } from '../../../shared/services/form-error.service';

@Component({
  standalone: true,
  selector: 'app-physical-stats',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './physical-stats.component.html',
  styleUrl: './physical-stats.component.css'
})
export class PhysicalStatsComponent implements OnInit {
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
        heightCm: user.heightCm || '',
        weightKg: user.weightKg || '',
        age: user.age || '',
        gender: user.gender || '',
        activity: user.activity || '',
        goal: user.goal || ''
      });
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      heightCm: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
      weightKg: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      age: ['', [Validators.required, Validators.min(10), Validators.max(120)]],
      gender: ['', Validators.required],
      activity: ['', Validators.required],
      goal: ['', Validators.required]
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
