// E2E — Social Notifications page
// Verifies notification list renders, unread items are highlighted,
// "Mark all read" calls the correct API, and empty state shows correctly.
// All .NET API calls are mocked.

describe('Social Notifications', () => {
  beforeEach(() => {
    cy.stubSocialNotificationsApis();
  });

  it('renders the notifications page', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.get('[data-cy="notif-page"]').should('exist');
  });

  it('shows the "Notifications" heading', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.contains('h1', 'Notifications').should('be.visible');
  });

  it('shows the notification list with items from the fixture', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.get('[data-cy="notif-list"]').should('exist');
    cy.get('[data-cy="notif-item"]').should('have.length', 3);
  });

  it('shows unread indicator on unread notifications', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.get('[data-cy="notif-item"].notif-item--unread').should('have.length', 2);
  });

  it('shows notification actor name and message', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.get('[data-cy="notif-item"]').first().should('contain.text', 'Alex Runner');
    cy.get('[data-cy="notif-item"]').first().should('contain.text', 'liked your post');
  });

  it('shows "Mark all read" button when there are unread notifications', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.get('[data-cy="notif-mark-all"]').should('be.visible');
  });

  it('calls mark-all-read API when "Mark all read" is clicked', () => {
    cy.loginByApi('/social/notifications');
    cy.wait('@getNotifications');

    cy.get('[data-cy="notif-mark-all"]').click();
    cy.wait('@markAllRead');
  });

  it('shows empty state when there are no notifications', () => {
    cy.intercept('GET', '**/api/notifications*', {
      statusCode: 200,
      body: { items: [], page: 1, pageSize: 20, hasMore: false },
    }).as('getEmptyNotifications');

    cy.loginByApi('/social/notifications');
    cy.wait('@getEmptyNotifications');

    cy.get('[data-cy="notif-empty"]').should('be.visible');
    cy.get('[data-cy="notif-empty"]').should('contain.text', 'No notifications yet');
  });

  it('does not show "Mark all read" when all notifications are already read', () => {
    cy.intercept('GET', '**/api/notifications*', {
      statusCode: 200,
      body: {
        items: [
          {
            id: 301,
            type: 'like',
            actor: { id: 'user-x', displayName: 'User X', avatarUrl: null },
            message: 'liked your post',
            createdAt: '2026-07-15T10:00:00Z',
            isRead: true,
            referenceId: 1,
          },
        ],
        page: 1,
        pageSize: 20,
        hasMore: false,
      },
    }).as('getAllReadNotifications');

    cy.loginByApi('/social/notifications');
    cy.wait('@getAllReadNotifications');

    cy.get('[data-cy="notif-mark-all"]').should('not.exist');
  });
});
