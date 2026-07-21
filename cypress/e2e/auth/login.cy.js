// E2E — Login flow
// All .NET API calls are mocked; tests run without a live backend.

describe('Login flow', () => {
  beforeEach(() => {
    // Register intercepts BEFORE the visit so they're active on app bootstrap.
    cy.stubDashboardApis();

    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      fixture: 'auth/login-response.json',
    }).as('loginRequest');

    cy.visit('/login');
  });

  it('renders the login form', () => {
    cy.get('[data-cy="login-form"]').should('exist');
    cy.get('[data-cy="login-email"]').should('be.visible');
    cy.get('[data-cy="login-password"]').should('be.visible');
    cy.get('[data-cy="login-submit"]').should('be.visible');
  });

  it('shows validation errors when submitted empty', () => {
    cy.get('[data-cy="login-submit"]').click();

    // Angular marks controls as touched on markAllAsTouched(), triggering mat-error
    cy.get('mat-error').should('have.length.greaterThan', 0);
  });

  it('shows an error state on invalid credentials (401)', () => {
    cy.intercept('POST', '**/api/auth/login', { statusCode: 401 }).as('loginFail');

    cy.get('[data-cy="login-email"]').type('wrong@example.com');
    cy.get('[data-cy="login-password"]').type('BadPassword1!');
    cy.get('[data-cy="login-submit"]').click();

    cy.wait('@loginFail');

    // ngx-toastr renders a toast for failed login — the facade calls alerts.warn()
    cy.get('.toast-warning, .toast-container').should('exist');
  });

  it('redirects to /user-dashboard on successful login', () => {
    cy.get('[data-cy="login-email"]').type('cypress@example.com');
    cy.get('[data-cy="login-password"]').type('ValidPass123!');
    cy.get('[data-cy="login-submit"]').click();

    cy.wait('@loginRequest').its('request.body').should('deep.include', {
      email: 'cypress@example.com',
    });

    cy.url().should('include', '/user-dashboard');
  });

  it('persists the JWT to localStorage after login', () => {
    cy.get('[data-cy="login-email"]').type('cypress@example.com');
    cy.get('[data-cy="login-password"]').type('ValidPass123!');
    cy.get('[data-cy="login-submit"]').click();

    cy.wait('@loginRequest');

    cy.window().then(win => {
      const stored = win.localStorage.getItem('auth_v1');
      expect(stored).to.not.be.null;
      const auth = JSON.parse(stored);
      expect(auth).to.have.property('token').that.is.a('string').and.not.empty;
      expect(auth).to.have.property('email', 'cypress@example.com');
    });
  });

  it('navigates to /register from the login page', () => {
    cy.contains('Create one').click();
    cy.url().should('include', '/register');
  });
});
