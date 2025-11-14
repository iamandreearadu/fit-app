import { Injectable, computed } from '@angular/core';
import { UserStore } from '../store/user.store';
import { UserMetricsService } from '../services/user-metrics.service';
import { UserFitMetrics } from '../models/user-fit-metrics.model';
import { UserValidationService } from '../validations/user-validation.service';
import { UserProfile } from '../models/user.model';
import { UserService } from '../../api/user.service';

@Injectable({ providedIn: 'root' })
export class UserFacade {
  private _metrics = computed<UserFitMetrics | null>(() => null);

  constructor(
    private store: UserStore,
    private userService: UserService,
    private metricsSvc: UserMetricsService,
    private validation: UserValidationService
  ) {
    // initialize computed now that services are available
    this._metrics = computed<UserFitMetrics | null>(() => {
      const u = this.store.user();
      if (!u) return null;
      return this.metricsSvc.compute(u);
    });
  }

  // expose validators via facade so components stay thin
  getValidators() {
    return this.validation;
  }

  get user() {
    return this.store.user;
  }

  get loading() {
    return this.store.loading;
  }

  get metrics() {
    return this._metrics;
  }

  hydrateFromLocalStorage() {
    this.store.hydrateFromLocalStorage();
  }

  async loadUser() {
    this.loading.set(true);
    try {
      const u = await this.userService.getCurrentUser();
      this.store.setUser(u);
    } finally {
      this.loading.set(false);
    }
  }

  async updateProfile(patch: Partial<UserProfile>) {
    this.loading.set(true);
    try {
      const updated = await this.userService.updateProfile(patch);
      this.store.setUser(updated);
      return updated;
    }
    catch(error)
    {
      console.error('Failed to update profile', error);
      throw error;
    }
    finally {
      setTimeout(() => {
        this.loading.set(false);
      }, 2000);
    }
  }



  // small helper to format validation messages from validation service
  getValidationMessage(controlName: string, errors: any) {
    return this.validation.getErrorMessage(controlName, errors);
  }
}
