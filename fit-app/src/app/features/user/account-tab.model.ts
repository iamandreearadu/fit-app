export type AccountTab =
  | 'profile'
  | 'physical'
  | 'workouts'
  | 'nutrition'
  | 'progress'
  | 'goals'
  | 'settings'
  | 'notifications';

export interface AccountTabDefinition {
  id: AccountTab;
  mobileLabel: string;
  desktopLabel: string;
  icon: string;
  route: string;
}

export const ACCOUNT_TABS: readonly AccountTabDefinition[] = [
  { id: 'profile', mobileLabel: 'Account', desktopLabel: 'Account', icon: 'person', route: '/account/my-account' },
  { id: 'physical', mobileLabel: 'Physical', desktopLabel: 'Physical & Metrics', icon: 'fitness_center', route: '/account/physical' },
  { id: 'workouts', mobileLabel: 'Workouts', desktopLabel: 'My Workouts', icon: 'sports_gymnastics', route: '/account/workouts' },
  { id: 'nutrition', mobileLabel: 'Nutrition', desktopLabel: 'Nutrition Plans', icon: 'restaurant', route: '/account/nutrition' },
  { id: 'progress', mobileLabel: 'Progress', desktopLabel: 'Progress', icon: 'trending_up', route: '/account/progress' },
  { id: 'goals', mobileLabel: 'Goals', desktopLabel: 'Goals', icon: 'flag', route: '/account/goals' },
  { id: 'settings', mobileLabel: 'Settings', desktopLabel: 'Settings', icon: 'settings', route: '/account/settings' },
  { id: 'notifications', mobileLabel: 'Alerts', desktopLabel: 'Notifications', icon: 'notifications', route: '/account/notifications' },
] as const;

const ACCOUNT_TAB_IDS = new Set<AccountTab>(ACCOUNT_TABS.map((tab) => tab.id));

export function isAccountTab(value: string | null): value is AccountTab {
  return value !== null && ACCOUNT_TAB_IDS.has(value as AccountTab);
}
