# Account Child Routes — Implementation

Date: 2026-07-23  
Status: Implemented and verified

## Outcome

The Account area was refactored from a single page that conditionally rendered every tab into an Account shell with independent child routes and lazy-loaded tab components.

The canonical route structure is now:

- `/account/my-account`
- `/account/physical`
- `/account/workouts`
- `/account/nutrition`
- `/account/progress`
- `/account/goals`
- `/account/settings`
- `/account/notifications`

`/account` redirects to `/account/my-account`.

## Implemented architecture

### Account shell

`UserPageComponent` now owns only the shared Account layout:

- mobile and desktop tab navigation;
- active-route state;
- responsive tab rail behavior;
- nested `router-outlet`.

It no longer imports or renders every Account tab eagerly.

### Child routes

The child route configuration lives in:

- `fit-app/src/app/features/user/account.routes.ts`

Every tab is loaded with `loadComponent`, which creates separate lazy chunks and reduces the initial Account bundle.

### Shared tab model

The route names, labels, icons and navigation metadata are centralized in:

- `fit-app/src/app/features/user/account-tab.model.ts`

Both mobile and desktop navigation use this source, avoiding duplicate tab definitions and route drift.

### Extracted placeholder tabs

The remaining inline views were moved to standalone child components:

- Progress
- Goals
- Settings
- Notifications

Their common presentation is stored in `coming-soon-tab.css`.

## Compatibility

Legacy Account links using `?tab=...` are normalized to the corresponding canonical child route. For example:

- `/account?tab=workouts` becomes `/account/workouts`
- `/account?tab=nutrition` becomes `/account/nutrition`
- `/account?tab=profile` becomes `/account/my-account`

Any unrelated query parameters are retained during this redirect.

Existing internal navigation was migrated to canonical routes, including:

- the mobile create-action sheet;
- onboarding navigation;
- header Account links;
- side drawer and footer links;
- dashboard Account empty states.

## Navigation and UX

- Tab selection now follows Angular Router state instead of manual component state.
- `routerLinkActive` controls the visual active state and `aria-current`.
- Browser history, refresh and deep links work for every Account tab.
- On mobile, the active tab is scrolled into view after navigation.
- Each tab receives its normal component lifecycle when entered or left.
- No custom route reuse strategy was introduced.

## Documentation updated

The application structure and route documentation were aligned in:

- `CLAUDE.md`
- `README.md`
- `fit-app/README.md`
- `.claude/design-specs/modules-consistency-pass.md`

The earlier Account implementation plan remains in:

- `.claude/decisions/account-child-routes-plan-2026-07-23.md`

## Verification

- Production build: passed.
- Unit tests: 74 passed.
- Route metadata test added for canonical uniqueness and tab validation.
- Diff whitespace validation: passed.
- Search confirmed that Account no longer uses manual `activeTab`, `setActiveTab` or internal `?tab=` navigation.

The test runner still reports non-blocking warnings for the pre-existing missing test asset `assets/fitapp-wb.png`; these warnings are unrelated to this refactor.

## Data and backend impact

No API contract, database schema or persisted Account data was changed. The implementation changes routing, component ownership and loading behavior only.

## Acceptance checklist

- [x] Account is a parent shell with a nested outlet.
- [x] Every Account tab has its own canonical URL.
- [x] Every tab is lazy-loaded.
- [x] `/account` has a safe default redirect.
- [x] Legacy query-based Account links remain compatible.
- [x] Internal links use canonical routes.
- [x] Mobile and desktop tab navigation share one configuration.
- [x] Direct navigation and page refresh are supported.
- [x] Build and unit tests pass.
- [x] Architecture documentation is updated.
