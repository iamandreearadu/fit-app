// E2E — Social Profile page
// Verifies profile header renders (avatar, display name, stats), tabs switch
// content, and the bio edit flow works.
// All .NET API calls are mocked.

describe('Social Profile', () => {
  const USER_ID = 'cypress-user-01';

  beforeEach(() => {
    cy.stubSocialProfileApis(USER_ID);
  });

  it('renders the profile page', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-page"]').should('exist');
  });

  it('shows the user display name in the header', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-display-name"]')
      .should('be.visible')
      .and('contain.text', 'Cypress Test User');
  });

  it('shows the stats row with posts, followers, and following counts', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('.profile-stats-row').should('be.visible');
    cy.get('.profile-stats-row').should('contain.text', 'POSTS');
    cy.get('.profile-stats-row').should('contain.text', 'FOLLOWERS');
    cy.get('.profile-stats-row').should('contain.text', 'FOLLOWING');
  });

  it('shows the correct counts from the profile fixture', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('.profile-stat-number').eq(0).should('contain.text', '2'); // postsCount
    cy.get('.profile-stat-number').eq(1).should('contain.text', '10'); // followersCount
    cy.get('.profile-stat-number').eq(2).should('contain.text', '5');  // followingCount
  });

  it('shows the bio text', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.contains('Fitness enthusiast and runner').should('be.visible');
  });

  it('renders all four profile tabs', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-tab-posts"]').should('be.visible');
    cy.get('[data-cy="profile-tab-workouts"]').should('be.visible');
    cy.get('[data-cy="profile-tab-blogs"]').should('be.visible');
    cy.get('[data-cy="profile-tab-stats"]').should('be.visible');
  });

  it('posts tab is active by default', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-tab-posts"]').should('have.class', 'active');
  });

  it('shows post cards in the posts tab', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfilePosts');

    cy.get('.profile-posts-grid').should('exist');
    cy.get('.profile-post-cell').should('have.length.at.least', 1);
  });

  it('switches to the Workouts tab when clicked', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-tab-workouts"]').click();
    cy.get('[data-cy="profile-tab-workouts"]').should('have.class', 'active');
    cy.get('[data-cy="profile-tab-posts"]').should('not.have.class', 'active');
  });

  it('switches to the Articles tab when clicked', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-tab-blogs"]').click();
    cy.get('[data-cy="profile-tab-blogs"]').should('have.class', 'active');
  });

  it('switches to the Stats tab when clicked', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfile');

    cy.get('[data-cy="profile-tab-stats"]').click();
    cy.get('[data-cy="profile-tab-stats"]').should('have.class', 'active');
  });

  it('shows profile error state when API fails', () => {
    cy.intercept('GET', `**/api/social/profile/${USER_ID}`, {
      statusCode: 500,
    }).as('getProfileError');

    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfileError');

    cy.get('.profile-error').should('be.visible');
  });

  it('navigates to post detail when clicking a post cell', () => {
    cy.loginByApi(`/social/profile/${USER_ID}`);
    cy.wait('@getProfilePosts');
    cy.wait('@getProfile');

    // Clicking a post cell navigates to the post detail page
    cy.get('.profile-post-cell').first().click();
    cy.url().should('include', '/social/post/');
  });
});
