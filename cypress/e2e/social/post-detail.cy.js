// E2E — Social Post Detail page
// Verifies the full post renders, comments list loads, the composer
// submits new comments, and the back button works.
// All .NET API calls are mocked.

describe('Social Post Detail', () => {
  const POST_ID = 1;

  beforeEach(() => {
    cy.stubSocialPostDetailApis(POST_ID);
  });

  it('renders the post detail page', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    // Don't wait for @getPost on the first test — cold-start can exceed the 5s timeout.
    // Subsequent tests cover the post-card content (which requires a successful load).
    cy.get('[data-cy="post-detail-page"]').should('exist');
  });

  it('shows the back button', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getPost');

    cy.get('[data-cy="post-detail-back"]').should('be.visible');
  });

  it('renders the post card with post content', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getPost');

    cy.get('[data-cy="post-card"]').should('exist');
    cy.get('[data-cy="post-card"]').should('contain.text', '10k run');
  });

  it('loads and displays comments from the API', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getComments');

    cy.get('[data-cy="comment-row"]').should('have.length', 2);
    cy.get('[data-cy="comment-row"]').first().should('contain.text', 'Alex Runner');
    cy.get('[data-cy="comment-row"]').first().should('contain.text', 'Amazing work!');
  });

  it('shows "Be the first to comment" when there are no comments', () => {
    cy.intercept('GET', `**/api/social/posts/${POST_ID}/comments*`, {
      statusCode: 200,
      body: { items: [], page: 1, pageSize: 20, hasMore: false },
    }).as('getEmptyComments');

    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getEmptyComments');

    cy.get('[data-cy="comments-empty"]').should('be.visible');
    cy.get('[data-cy="comments-empty"]').should('contain.text', 'Be the first');
  });

  it('shows the comment composer at the bottom', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);

    cy.get('[data-cy="composer-input"]').should('exist');
    cy.get('[data-cy="composer-send"]').should('exist');
  });

  it('send button is disabled when composer input is empty', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getPost');

    cy.get('[data-cy="composer-send"]').should('be.disabled');
  });

  it('send button is enabled when composer has text', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getPost');

    cy.get('[data-cy="composer-input"]')
      .invoke('val', 'Test comment')
      .trigger('input');
    cy.get('[data-cy="composer-send"]').should('not.be.disabled');
  });

  it('submits a comment when send button is clicked', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getComments');

    cy.get('[data-cy="composer-input"]')
      .invoke('val', 'Test comment from Cypress')
      .trigger('input');
    // force:true skips actionability wait — Angular re-renders async and would otherwise
    // detach the button while Cypress is waiting for it to become clickable.
    cy.get('[data-cy="composer-send"]').click({ force: true });

    cy.wait('@addComment').its('request.body').should('deep.include', {
      content: 'Test comment from Cypress',
    });
  });

  it('submits a comment when Enter key is pressed', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getComments');

    // Set value first — Angular re-renders after trigger('input'), making the element stale.
    // Re-query and use force:true so the keydown fires before Angular detaches the textarea.
    cy.get('[data-cy="composer-input"]')
      .invoke('val', 'Enter key comment')
      .trigger('input');
    cy.get('[data-cy="composer-input"]')
      .trigger('keydown', { key: 'Enter', keyCode: 13, shiftKey: false, force: true });
    cy.wait('@addComment');
  });

  it('clears the composer input after successful comment submission', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getComments');

    cy.get('[data-cy="composer-input"]')
      .invoke('val', 'My new comment')
      .trigger('input');
    cy.get('[data-cy="composer-send"]').click({ force: true });

    cy.wait('@addComment');
    cy.get('[data-cy="composer-input"]').should('have.value', '');
  });

  it('shows a delete button for own comments', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getComments');

    // fixture has one own comment (isOwnComment: true)
    cy.get('[data-cy="comment-row"]').last().find('.comment-delete-btn').should('exist');
  });

  it('navigates back when the back button is clicked', () => {
    cy.loginByApi(`/social/post/${POST_ID}`);
    cy.wait('@getPost');

    cy.get('[data-cy="post-detail-back"]').click();
    cy.url().should('not.include', `/social/post/${POST_ID}`);
  });
});
