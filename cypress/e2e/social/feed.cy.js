// E2E — Social Feed page
// Verifies feed renders posts, handles like/comment interactions,
// shows empty/error states, and exposes the create-post FAB.
// All .NET API calls are mocked.

describe('Social Feed', () => {
  beforeEach(() => {
    cy.stubSocialFeedApis();
  });

  it('renders the feed page when authenticated', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="feed-page"]').should('exist');
  });

  it('renders post cards from the feed response', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="feed-list"]').should('exist');
    cy.get('[data-cy="post-card"]').should('have.length.at.least', 1);
  });

  it('shows the author name on each post card', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="post-card"]').first().should('contain.text', 'Alex Runner');
  });

  it('shows post content text', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="post-card"]')
      .first()
      .should('contain.text', '10k run');
  });

  it('shows like and comment action buttons on each post', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="post-card"]').first().within(() => {
      cy.get('[data-cy="post-like-btn"]').should('exist');
      cy.get('[data-cy="post-comment-btn"]').should('exist');
    });
  });

  it('calls the like API when like button is clicked', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="post-card"]').first().find('[data-cy="post-like-btn"]').click();
    cy.wait('@toggleLike');
  });

  it('navigates to post detail when comment button is clicked', () => {
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    cy.get('[data-cy="post-card"]').first().find('[data-cy="post-comment-btn"]').click();
    cy.url().should('include', '/social/post/');
  });

  it('renders the mobile create-post button', () => {
    cy.viewport('iphone-x');
    cy.loginByApi('/social');
    cy.wait('@getFeed');

    // On mobile, the bottom-nav center button is the create action (feed-fab is CSS-hidden)
    cy.get('.bottomnav-create').should('be.visible');
  });

  it('shows regular empty state when user follows people but no posts exist', () => {
    cy.intercept('GET', '**/api/social/feed*', {
      statusCode: 200,
      body: { items: [], page: 1, pageSize: 10, hasMore: false },
    }).as('getEmptyFeed');

    cy.intercept('GET', '**/api/social/profile/me/following-count', {
      statusCode: 200,
      body: { count: 5 },
    }).as('getFollowingCountNonZero');

    cy.loginByApi('/social');
    cy.wait('@getEmptyFeed');
    cy.wait('@getFollowingCountNonZero');

    cy.get('[data-cy="feed-empty"]').should('be.visible');
    cy.get('[data-cy="feed-empty"]').should('contain.text', 'No posts yet');
  });

  it('shows feed error state when API fails', () => {
    cy.intercept('GET', '**/api/social/feed*', {
      statusCode: 500,
      body: { error: 'Server error' },
    }).as('getFeedError');

    cy.loginByApi('/social');
    cy.wait('@getFeedError');

    cy.get('[data-cy="feed-error"]').should('be.visible');
    cy.get('[data-cy="feed-error"]').should('contain.text', 'Failed');
  });

  it('shows follow button for posts where user is not following the author', () => {
    cy.intercept('GET', '**/api/social/feed*', {
      statusCode: 200,
      body: {
        items: [{
          id: 10,
          author: { id: 'new-user', displayName: 'New User', avatarUrl: null },
          content: 'Follow me!',
          imageUrl: null,
          linkedContent: null,
          likesCount: 0,
          commentsCount: 0,
          isLikedByMe: false,
          isFollowingAuthor: false,
          isOwnPost: false,
          isArchived: false,
          createdAt: '2026-07-15T08:00:00Z',
          isSeedContent: false,
        }],
        page: 1, pageSize: 10, hasMore: false,
      },
    }).as('getFeedWithUnfollowed');

    cy.loginByApi('/social');
    cy.wait('@getFeedWithUnfollowed');

    cy.get('[data-cy="post-follow-btn"]').should('exist').and('contain.text', 'Follow');
  });
});
