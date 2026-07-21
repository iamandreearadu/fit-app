// E2E — Route guards
// AuthGuard blocks unauthenticated access; GuestGuard redirects authenticated
// users away from login/register. All API calls are mocked.

describe('Route guards', () => {
  beforeEach(() => {
    cy.stubDashboardApis();
  });

  context('AuthGuard — protected routes require authentication', () => {
    const protectedRoutes = [
      '/user-dashboard',
      '/account',
      '/social',
      '/social/discover',
      '/social/notifications',
    ];

    protectedRoutes.forEach(route => {
      it(`redirects unauthenticated users from ${route} to /login`, () => {
        cy.visit(route);
        cy.url().should('include', '/login');
      });
    });

    it('allows authenticated users to access /user-dashboard', () => {
      cy.loginByApi('/user-dashboard');
      cy.wait('@getProfile');
      cy.url().should('include', '/user-dashboard');
    });

    it('allows authenticated users to access /social', () => {
      cy.stubSocialFeedApis();
      cy.loginByApi('/social');
      cy.url().should('include', '/social');
    });
  });

  context('GuestGuard — authenticated users are redirected from auth pages', () => {
    it('redirects authenticated users away from /login', () => {
      cy.loginByApi('/login');
      cy.url().should('not.include', '/login');
    });

    it('redirects authenticated users away from /register', () => {
      cy.loginByApi('/register');
      cy.url().should('not.include', '/register');
    });
  });

  context('Home page', () => {
    it('home page is accessible without authentication', () => {
      cy.visit('/');
      cy.url().should('not.include', '/login');
    });
  });
});
