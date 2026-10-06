import { CanDeactivateFn } from '@angular/router';

export interface CanLeaveAnalyzeMeal {
  canLeavePage(): boolean | Promise<boolean>;
}

export const analyzeMealExitGuard: CanDeactivateFn<CanLeaveAnalyzeMeal> =
  component => component.canLeavePage();

