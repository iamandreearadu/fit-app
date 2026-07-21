// ─── Auth helpers ────────────────────────────────────────────────────────────

/**
 * Seeds localStorage with a valid auth token and navigates to the given path.
 * Bypasses the login UI entirely — use in tests that need an authenticated
 * starting state without exercising the login form.
 */
Cypress.Commands.add('loginByApi', (path = '/', overrides = {}) => {
  cy.fixture('auth/login-response.json').then(auth => {
    const payload = { ...auth, ...overrides };
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('auth_v1', JSON.stringify(payload));
      },
    });
  });
});

// ─── Common API stub helpers ──────────────────────────────────────────────────

/**
 * Stubs the SignalR hub negotiation + shared API calls that fire on every
 * authenticated page load. Call before cy.visit().
 */
Cypress.Commands.add('stubCommonApis', () => {
  cy.intercept('POST', '**/hubs/**', {
    statusCode: 200,
    body: { connectionId: 'cypress-conn', availableTransports: [] },
  }).as('hubNegotiate');

  cy.intercept('GET', '**/api/notifications/unread-count', {
    statusCode: 200,
    body: { count: 2 },
  }).as('getUnreadCount');

  cy.intercept('GET', '**/api/users/me', {
    fixture: 'auth/user-profile.json',
  }).as('getProfile');

  cy.intercept('GET', '**/api/daily/streak', {
    fixture: 'auth/streak.json',
  }).as('getStreak');

  // Social shell calls loadConversations() on every social page load.
  // Mock it to prevent unmocked requests from hitting the real server and
  // triggering a 401 → /login redirect during tests that wait longer.
  cy.intercept('GET', '**/api/conversations*', {
    statusCode: 200,
    body: [],
  }).as('getConversations');

  // SocialDailyPanelComponent is always rendered in the social shell and calls
  // these two endpoints on init. Without mocks they hit the real server with a
  // fake token, return 401, and the auth interceptor redirects to /login.
  cy.intercept('GET', '**/api/daily*', {
    fixture: 'auth/daily-entry.json',
  }).as('getDaily');
  cy.intercept('GET', '**/api/daily/today/summary', {
    fixture: 'auth/daily-summary.json',
  }).as('getDailySummary');
});

/**
 * Stubs all HTTP requests that fire when the dashboard loads.
 */
Cypress.Commands.add('stubDashboardApis', () => {
  cy.stubCommonApis();

  cy.intercept('GET', '**/api/daily/history', { statusCode: 200, body: [] }).as('getDailyHistory');
  cy.intercept('GET', '**/api/daily/today/summary', { fixture: 'auth/daily-summary.json' }).as('getDailySummary');
  cy.intercept('GET', '**/api/daily*', { fixture: 'auth/daily-entry.json' }).as('getDaily');
  cy.intercept('GET', '**/api/workouts*', { statusCode: 200, body: [] }).as('getWorkouts');
});

/**
 * Stubs all HTTP requests that fire when the onboarding page loads.
 */
Cypress.Commands.add('stubOnboardingApis', () => {
  cy.intercept('POST', '**/hubs/**', {
    statusCode: 200,
    body: { connectionId: 'cypress-conn', availableTransports: [] },
  }).as('hubNegotiate');

  cy.intercept('GET', '**/api/daily/streak', { fixture: 'auth/streak.json' }).as('getStreak');
  cy.intercept('GET', '**/api/notifications/unread-count', { statusCode: 200, body: { count: 0 } }).as('getUnreadCount');
  cy.intercept('GET', '**/api/users/me', { fixture: 'auth/user-profile.json' }).as('getProfile');
  cy.intercept('GET', '**/api/onboarding/status', {
    statusCode: 200,
    body: { isComplete: false, lastCompletedStep: null, nextStep: 'carousel' },
  }).as('getOnboardingStatus');
});

// ─── Social API stub helpers ──────────────────────────────────────────────────

/**
 * Stubs all HTTP requests that fire when the social feed page loads.
 */
Cypress.Commands.add('stubSocialFeedApis', () => {
  cy.stubCommonApis();

  cy.intercept('GET', '**/api/social/feed*', {
    fixture: 'social/feed.json',
  }).as('getFeed');

  cy.intercept('GET', '**/api/social/profile/me/following-count', {
    statusCode: 200,
    body: { count: 3 },
  }).as('getFollowingCount');

  cy.intercept('GET', '**/api/social/discover/suggested*', {
    statusCode: 200,
    body: [],
  }).as('getSuggested');

  cy.intercept('POST', '**/api/social/posts/*/like', {
    statusCode: 200,
    body: { isLiked: true, likesCount: 6 },
  }).as('toggleLike');
});

/**
 * Stubs all HTTP requests for the social discover page.
 */
Cypress.Commands.add('stubSocialDiscoverApis', () => {
  cy.stubCommonApis();

  // Register suggested BEFORE discover so that in Cypress LIFO order,
  // suggested (more specific) is checked first for /discover/suggested URLs.
  cy.intercept('GET', '**/api/social/discover/suggested*', {
    statusCode: 200,
    body: [],
  }).as('getSuggested');

  // Use req.reply() so the response is delivered synchronously to the browser
  // and avoids any async fixture-read timing issues.
  cy.intercept('GET', /\/api\/social\/discover(?!\/)/, (req) => {
    req.reply({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        items: [
          {
            id: 3,
            author: { id: 'user-beta', displayName: 'Beta Lifter', avatarUrl: null, isVerified: false },
            content: 'Hit a new PR on deadlifts today — 180kg!',
            imageUrl: null,
            linkedContent: null,
            likesCount: 12,
            commentsCount: 3,
            isLikedByMe: false,
            isFollowingAuthor: false,
            isOwnPost: false,
            isArchived: false,
            createdAt: '2026-07-15T07:00:00Z',
            isSeedContent: false,
          },
          {
            id: 4,
            author: { id: 'user-gamma', displayName: 'Gamma Lifter', avatarUrl: null, isVerified: false },
            content: 'Rest day recovery tips: foam roll, stretch, hydrate!',
            imageUrl: null,
            linkedContent: null,
            likesCount: 7,
            commentsCount: 1,
            isLikedByMe: false,
            isFollowingAuthor: false,
            isOwnPost: false,
            isArchived: false,
            createdAt: '2026-07-14T16:00:00Z',
            isSeedContent: false,
          },
        ],
        page: 1,
        pageSize: 12,
        hasMore: false,
      },
    });
  }).as('getDiscover');

  cy.intercept('GET', '**/api/social/users/search*', (req) => {
    req.reply({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: [
        { id: 'user-alpha', displayName: 'Alex Runner', avatarUrl: null, isFollowedByMe: false },
        { id: 'user-beta', displayName: 'Beta Lifter', avatarUrl: null, isFollowedByMe: false },
      ],
    });
  }).as('searchUsers');

  cy.intercept('POST', '**/api/social/follow/*', {
    statusCode: 200,
    body: { isFollowing: true, followersCount: 11 },
  }).as('toggleFollow');
});

/**
 * Stubs all HTTP requests for a social post detail page.
 */
Cypress.Commands.add('stubSocialPostDetailApis', (postId = 1) => {
  cy.stubCommonApis();

  cy.intercept('GET', `**/api/social/posts/${postId}`, {
    body: {
      id: postId,
      author: { id: 'user-alpha', displayName: 'Alex Runner', avatarUrl: null, isVerified: false },
      content: 'Just finished a 10k run! Personal best this month.',
      imageUrl: null,
      linkedContent: null,
      likesCount: 5,
      commentsCount: 2,
      isLikedByMe: false,
      isFollowingAuthor: true,
      isOwnPost: false,
      isArchived: false,
      createdAt: '2026-07-15T08:30:00Z',
      isSeedContent: false,
    },
  }).as('getPost');

  cy.intercept('GET', `**/api/social/posts/${postId}/comments*`, {
    fixture: 'social/comments.json',
  }).as('getComments');

  cy.intercept('POST', `**/api/social/posts/${postId}/comments`, {
    statusCode: 201,
    body: {
      id: 999,
      author: { id: 'cypress-user-01', displayName: 'Cypress Test User', avatarUrl: null },
      content: 'Test comment from Cypress',
      createdAt: '2026-07-15T12:00:00Z',
      isOwnComment: true,
    },
  }).as('addComment');
});

/**
 * Stubs all HTTP requests for a social profile page.
 */
Cypress.Commands.add('stubSocialProfileApis', (userId = 'cypress-user-01') => {
  cy.stubCommonApis();

  cy.intercept('GET', `**/api/social/profile/${userId}`, {
    fixture: 'social/profile.json',
  }).as('getProfile');

  cy.intercept('GET', `**/api/social/profile/${userId}/posts*`, {
    fixture: 'social/profile-posts.json',
  }).as('getProfilePosts');

  cy.intercept('GET', `**/api/social/profile/${userId}/workouts*`, {
    statusCode: 200,
    body: { items: [], page: 1, pageSize: 12, hasMore: false },
  }).as('getProfileWorkouts');

  cy.intercept('GET', `**/api/social/profile/${userId}/blogs*`, {
    statusCode: 200,
    body: { items: [], page: 1, pageSize: 12, hasMore: false },
  }).as('getProfileBlogs');

  cy.intercept('GET', '**/api/social/profile/*/following-count', {
    statusCode: 200,
    body: { count: 5 },
  }).as('getFollowingCount');
});

/**
 * Stubs all HTTP requests for the social notifications page.
 */
Cypress.Commands.add('stubSocialNotificationsApis', () => {
  cy.stubCommonApis();

  cy.intercept('GET', '**/api/notifications*', {
    fixture: 'social/notifications.json',
  }).as('getNotifications');

  cy.intercept('PUT', '**/api/notifications/read-all', {
    statusCode: 204,
  }).as('markAllRead');
});

/**
 * Stubs all HTTP requests for the user /account page with workouts tab.
 */
Cypress.Commands.add('stubAccountApis', () => {
  cy.stubCommonApis();

  cy.intercept('GET', '**/api/workouts*', {
    fixture: 'workouts/list.json',
  }).as('getWorkouts');

  cy.intercept('POST', '**/api/workouts*', {
    statusCode: 201,
    body: {
      uid: 'wt-new',
      title: 'New Test Workout',
      type: 'Strength',
      durationMin: 45,
      caloriesEstimateKcal: 300,
      notes: '',
      exercises: [],
      cardio: null,
    },
  }).as('createWorkout');

  cy.intercept('DELETE', '**/api/workouts/*', {
    statusCode: 204,
  }).as('deleteWorkout');

  cy.intercept('PUT', '**/api/workouts/*', {
    statusCode: 200,
    body: {},
  }).as('updateWorkout');

  // Other tabs on the account page
  cy.intercept('GET', '**/api/daily*', { fixture: 'auth/daily-entry.json' }).as('getDaily');
  cy.intercept('GET', '**/api/nutrition*', { statusCode: 200, body: [] }).as('getNutrition');
});
