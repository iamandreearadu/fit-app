import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public facade = inject(UserFacade);

  public metrics = this.facade.metrics;
  public user    = this.facade.user;

  public readonly today = new Date();

  public get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  public get firstName(): string {
    return this.user()?.fullName?.split(' ')[0] ?? '';
  }

  public get bmi(): number | null {
    const u = this.user();
    if (!u?.weightKg || !u?.heightCm) return null;
    return u.weightKg / Math.pow(u.heightCm / 100, 2);
  }

  public get goalLabel(): string {
    const g = this.user()?.goal;
    if (g === 'lose') return 'Weight Loss';
    if (g === 'gain') return 'Muscle Gain';
    return 'Maintenance';
  }

  public get goalClass(): string {
    const g = this.user()?.goal;
    if (g === 'lose') return 'goal-lose';
    if (g === 'gain') return 'goal-gain';
    return 'goal-maintain';
  }
}
