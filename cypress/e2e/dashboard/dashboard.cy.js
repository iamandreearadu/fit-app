// E2E — Dashboard page
// Verifies that the authenticated dashboard loads, greeting renders,
// and streak/at-risk states display correctly.
// All .NET API calls are mocked — no live backend required.

describe('Dashboard page', () => {
  beforeEach(() => {
    cy.stubDashboardApis();
  });

  it('loads the dashboard when authenticated', () => {
    cy.loginByApi('/user-dashboard');
    cy.wait('@getProfile');

    cy.url().should('include', '/user-dashboard');
    cy.get('[data-cy="dashboard-root"]').should('exist');
  });

  it('shows the greeting strip with the user first name', () => {
    cy.loginByApi('/user-dashboard');
    cy.wait('@getProfile');

    cy.get('[data-cy="greeting-strip"]').should('be.visible');
    cy.get('[data-cy="greeting-strip"]').should('contain.text', 'Cypress');
  });

  it('shows the streak chip when streak is active', () => {
    cy.intercept('GET', '**/api/daily/streak', {
      statusCode: 200,
      body: { current: 7, longest: 14, loggedToday: true, atRisk: false },
    }).as('getStreakActive');

    cy.loginByApi('/user-dashboard');
    cy.wait('@getStreakActive');

    cy.get('.streak-chip').should('be.visible');
    cy.get('.streak-chip').should('contain.text', '7');
  });

  it('shows the at-risk banner when streak is at risk', () => {
    cy.intercept('GET', '**/api/daily/streak', {
      statusCode: 200,
      body: { current: 5, longest: 10, loggedToday: false, atRisk: true },
    }).as('getStreakAtRisk');

    cy.loginByApi('/user-dashboard');
    cy.wait('@getStreakAtRisk');

    cy.get('.at-risk-strip').should('be.visible');
    cy.get('.at-risk-strip').should('contain.text', '5-day streak');
  });

  it('does not show the streak chip when streak is zero', () => {
    cy.intercept('GET', '**/api/daily/streak', {
      statusCode: 200,
      body: { current: 0, longest: 0, loggedToday: false, atRisk: false },
    }).as('getStreakZero');

    cy.loginByApi('/user-dashboard');
    cy.wait('@getStreakZero');

    cy.get('.streak-chip').should('not.exist');
  });

  it('redirects unauthenticated users to /login', () => {
    cy.visit('/user-dashboard');
    cy.url().should('include', '/login');
  });

  it('keeps the JWT in localStorage throughout the session', () => {
    cy.loginByApi('/user-dashboard');
    cy.wait('@getProfile');

    cy.window().then(win => {
      const stored = win.localStorage.getItem('auth_v1');
      expect(stored).to.not.be.null;
      const auth = JSON.parse(stored);
      expect(auth).to.have.property('token').that.is.a('string').and.not.empty;
    });
  });

  it('sends Authorization header on authenticated API requests', () => {
    cy.loginByApi('/user-dashboard');

    cy.wait('@getProfile').its('request.headers').should('satisfy', headers => {
      const auth = headers['authorization'] ?? headers['Authorization'] ?? '';
      return auth.startsWith('Bearer ');
    });
  });
});
