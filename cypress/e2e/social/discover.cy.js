// E2E — Social Discover page
// Verifies discover renders user cards and posts, search mode activates
// on input, and follow buttons call the correct API.
// All .NET API calls are mocked.

describe('Social Discover', () => {
  beforeEach(() => {
    cy.stubSocialDiscoverApis();
  });

  it('renders the discover page', () => {
    cy.loginByApi('/social/discover');
    cy.wait('@getDiscover');

    cy.get('[data-cy="discover-page"]').should('exist');
  });

  it('shows the "Athletes to Follow" section with user cards', () => {
    cy.loginByApi('/social/discover');
    cy.wait('@getDiscover');

    cy.contains('Athletes to Follow').should('be.visible');
    cy.get('.user-card').should('have.length.at.least', 1);
  });

  it('shows the "Recent Posts" section with post cards', () => {
    cy.loginByApi('/social/discover');
    cy.wait('@getDiscover');

    cy.contains('Recent Posts').should('be.visible');
    cy.get('[data-cy="post-card"]').should('have.length.at.least', 1);
  });

  it('shows the search input', () => {
    cy.loginByApi('/social/discover');

    cy.get('[data-cy="discover-search-input"]').should('be.visible');
  });

  it('switches to search mode when user types in the search input', () => {
    cy.loginByApi('/social/discover');

    cy.get('[data-cy="discover-search-input"]').clear().type('Alex');
    cy.wait('@searchUsers');

    // Discover grid should not be visible in search mode
    cy.get('.discover-search-results').should('exist');
    cy.contains('Athletes to Follow').should('not.exist');
  });

  it('shows search results with user names', () => {
    cy.loginByApi('/social/discover');

    cy.get('[data-cy="discover-search-input"]').clear().type('Alex');
    cy.wait('@searchUsers');

    cy.get('.search-result-row').should('have.length.at.least', 1);
    cy.get('.search-result-name').first().should('contain.text', 'Alex Runner');
  });

  it('shows a "no results" message when search yields nothing', () => {
    cy.intercept('GET', '**/api/social/users/search*', {
      statusCode: 200,
      body: [],
    }).as('searchEmpty');

    cy.loginByApi('/social/discover');
    cy.get('[data-cy="discover-search-input"]').clear().type('zzznobody');
    cy.wait('@searchEmpty');

    cy.get('.discover-empty').should('be.visible');
  });

  it('returns to discover mode when search input is cleared', () => {
    cy.loginByApi('/social/discover');

    cy.get('[data-cy="discover-search-input"]').clear().type('Alex');
    cy.wait('@searchUsers');

    cy.get('[data-cy="discover-search-input"]').clear();
    cy.contains('Athletes to Follow').should('be.visible');
  });

  it('calls the follow API when a follow button in user cards is clicked', () => {
    cy.loginByApi('/social/discover');
    cy.wait('@getDiscover');

    cy.get('.user-card-follow-btn').first().click();
    cy.wait('@toggleFollow');
  });

  it('follow button in search results calls the follow API', () => {
    cy.loginByApi('/social/discover');

    cy.get('[data-cy="discover-search-input"]').clear().type('Beta');
    cy.wait('@searchUsers');

    cy.get('.search-result-follow-btn').first().click();
    cy.wait('@toggleFollow');
  });
});
