// E2E — JWT persistence and authenticated dashboard load
//
// These tests verify that:
//  1. A JWT stored in localStorage survives a page load and keeps the user
//     authenticated (auth guard passes, app initializer restores state).
//  2. The dashboard renders its content when a valid auth token is present.
//  3. Clearing localStorage logs the user out (auth guard redirects to login).
//
// All .NET API calls are mocked via cy.stubDashboardApis() so the tests run
// without a live backend.

describe('JWT persistence and dashboard load', () => {
  beforeEach(() => {
    // Register intercepts before the app bootstraps.
    cy.stubDashboardApis();
  });

  it('restores auth state from localStorage and loads the dashboard', () => {
    cy.loginByApi('/user-dashboard');

    cy.wait('@getProfile');

    cy.url().should('include', '/user-dashboard');
    cy.get('[data-cy="dashboard-root"]').should('exist');
  });

  it('renders the greeting strip with the user\'s first name', () => {
    cy.loginByApi('/user-dashboard');

    cy.wait('@getProfile');

    // The greeting strip only renders once @if (user()) && @if (metrics()) are truthy.
    // The fixture has fullName "Cypress Test User" → first name is "Cypress".
    cy.get('[data-cy="greeting-strip"]').should('be.visible');
    cy.get('[data-cy="greeting-strip"]').should('contain.text', 'Cypress');
  });

  it('keeps the JWT in localStorage throughout the dashboard session', () => {
    cy.loginByApi('/user-dashboard');

    cy.wait('@getProfile');

    cy.window().then(win => {
      const stored = win.localStorage.getItem('auth_v1');
      expect(stored).to.not.be.null;

      const auth = JSON.parse(stored);
      expect(auth).to.have.property('token').that.is.a('string').and.not.empty;
      expect(auth).to.have.property('id', 'cypress-user-01');
    });
  });

  it('redirects to /login when no JWT is present in localStorage', () => {
    // No loginByApi call — visit without seeding auth
    cy.visit('/user-dashboard');
    cy.url().should('include', '/login');
  });

  it('redirects to /login after localStorage is cleared', () => {
    cy.loginByApi('/user-dashboard');
    cy.wait('@getProfile');

    // Clear auth from storage, then trigger a navigation to force guard re-check
    cy.window().then(win => {
      win.localStorage.removeItem('auth_v1');
    });

    cy.visit('/user-dashboard');
    cy.url().should('include', '/login');
  });

  it('sends the Authorization header on authenticated API requests', () => {
    cy.loginByApi('/user-dashboard');

    // Verify that the profile request carries the Bearer token (set by AuthInterceptor)
    cy.wait('@getProfile').its('request.headers').should('satisfy', headers => {
      const auth = headers['authorization'] ?? headers['Authorization'] ?? '';
      return auth.startsWith('Bearer ');
    });
  });
});
