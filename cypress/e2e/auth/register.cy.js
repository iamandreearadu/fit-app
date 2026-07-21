// E2E — Registration flow
// All .NET API calls are mocked; tests run without a live backend.

describe('Registration flow', () => {
  beforeEach(() => {
    // Stubs for the APIs that fire immediately after a successful register
    // (app bootstrap reads these before the onboarding page is shown).
    cy.stubOnboardingApis();

    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 201,
      fixture: 'auth/register-response.json',
    }).as('registerRequest');

    cy.visit('/register');
  });

  it('renders all required fields and the goal selector', () => {
    cy.get('[data-cy="register-form"]').should('exist');
    cy.get('[data-cy="register-fullname"]').should('be.visible');
    cy.get('[data-cy="register-email"]').should('be.visible');
    cy.get('[data-cy="register-password"]').should('be.visible');

    // Four goal cards should be rendered
    cy.get('[data-cy^="register-goal-"]').should('have.length', 4);
    cy.get('[data-cy="register-submit"]').should('be.visible');
  });

  it('shows validation errors when submitted empty', () => {
    cy.get('[data-cy="register-submit"]').click();
    cy.get('mat-error').should('have.length.greaterThan', 0);
  });

  it('highlights a selected goal card', () => {
    cy.get('[data-cy="register-goal-gain"]').click();
    cy.get('[data-cy="register-goal-gain"]').should('have.class', 'reg-goal-card--selected');
    cy.get('[data-cy="register-goal-lose"]').should('not.have.class', 'reg-goal-card--selected');
  });

  it('shows a conflict error when email is already registered (409)', () => {
    cy.intercept('POST', '**/api/auth/register', { statusCode: 409 }).as('registerConflict');

    cy.get('[data-cy="register-fullname"]').type('Test User');
    cy.get('[data-cy="register-email"]').type('existing@example.com');
    cy.get('[data-cy="register-password"]').type('ValidPass123!');
    cy.get('[data-cy="register-goal-maintain"]').click();
    cy.get('[data-cy="register-submit"]').click();

    cy.wait('@registerConflict');
    cy.get('.toast-warning, .toast-container').should('exist');
  });

  it('redirects to /onboarding after a successful registration', () => {
    cy.get('[data-cy="register-fullname"]').type('New Cypress User');
    cy.get('[data-cy="register-email"]').type('newuser@example.com');
    cy.get('[data-cy="register-password"]').type('ValidPass123!');
    cy.get('[data-cy="register-goal-gain"]').click();
    cy.get('[data-cy="register-submit"]').click();

    cy.wait('@registerRequest').its('request.body').should('deep.include', {
      email: 'newuser@example.com',
      goal: 'gain',
    });

    cy.url().should('include', '/onboarding');
  });

  it('persists the JWT to localStorage after a successful registration', () => {
    cy.get('[data-cy="register-fullname"]').type('New Cypress User');
    cy.get('[data-cy="register-email"]').type('newuser@example.com');
    cy.get('[data-cy="register-password"]').type('ValidPass123!');
    cy.get('[data-cy="register-goal-maintain"]').click();
    cy.get('[data-cy="register-submit"]').click();

    cy.wait('@registerRequest');

    cy.window().then(win => {
      const stored = win.localStorage.getItem('auth_v1');
      expect(stored).to.not.be.null;
      const auth = JSON.parse(stored);
      expect(auth).to.have.property('token').that.is.a('string').and.not.empty;
      expect(auth).to.have.property('id', 'cypress-reg-user-01');
    });
  });

  it('navigates to /login from the register page', () => {
    cy.contains('Log in').click();
    cy.url().should('include', '/login');
  });
});
