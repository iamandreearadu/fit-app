import { ACCOUNT_TABS, isAccountTab } from './account-tab.model';

describe('Account tab configuration', () => {
  it('defines unique canonical child routes for every tab', () => {
    const ids = ACCOUNT_TABS.map((tab) => tab.id);
    const routes = ACCOUNT_TABS.map((tab) => tab.route);

    expect(new Set(ids).size).toBe(ACCOUNT_TABS.length);
    expect(new Set(routes).size).toBe(ACCOUNT_TABS.length);
    expect(routes.every((route) => route.startsWith('/account/'))).toBeTrue();
  });

  it('accepts only configured legacy tab values', () => {
    expect(isAccountTab('workouts')).toBeTrue();
    expect(isAccountTab('nutrition')).toBeTrue();
    expect(isAccountTab('unknown')).toBeFalse();
    expect(isAccountTab(null)).toBeFalse();
  });
});
