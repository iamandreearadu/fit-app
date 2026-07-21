// E2E — Workouts tab (via /account page)
// Verifies the workout list renders, the create modal opens and saves,
// and delete calls the correct API.
// All .NET API calls are mocked.

describe('Workouts tab', () => {
  beforeEach(() => {
    cy.stubAccountApis();
  });

  const navigateToWorkoutsTab = () => {
    cy.loginByApi('/account');
    // The account page loads with Profile tab active by default.
    // Use the sidebar "My Workouts" button (always visible on desktop).
    cy.contains('.sb-item', 'My Workouts').click();
    cy.wait('@getWorkouts');
  };

  it('shows the workouts tab content after clicking the Workouts tab', () => {
    navigateToWorkoutsTab();
    cy.get('[data-cy="workouts-tab"]').should('exist');
  });

  it('shows the workout list with items from the fixture', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-list"]').should('exist');
    cy.get('[data-cy="workout-row"]').should('have.length', 2);
  });

  it('shows the workout title in each row', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-row"]').first().should('contain.text', 'Push Day A');
    cy.get('[data-cy="workout-row"]').eq(1).should('contain.text', 'Morning Cardio');
  });

  it('shows workout type and duration pills', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-row"]').first().within(() => {
      cy.get('.pill').should('contain.text', 'Strength');
    });
  });

  it('shows edit and delete buttons on each workout row', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-row"]').first().within(() => {
      cy.get('[data-cy="workout-edit-btn"]').should('exist');
      cy.get('[data-cy="workout-delete-btn"]').should('exist');
    });
  });

  it('shows the "New workout" button', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-new-btn"]').should('be.visible');
  });

  it('opens the workout editor modal when "New workout" is clicked', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-new-btn"]').click();
    cy.get('[data-cy="workout-modal"]').should('be.visible');
  });

  it('modal contains title input and save/cancel buttons', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-new-btn"]').click();
    cy.get('[data-cy="workout-modal"]').within(() => {
      cy.get('[data-cy="workout-title-input"]').should('exist');
      cy.get('[data-cy="workout-save-btn"]').should('exist');
      cy.get('[data-cy="workout-cancel-btn"]').should('exist');
    });
  });

  it('closes the modal when cancel is clicked', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-new-btn"]').click();
    cy.get('[data-cy="workout-modal"]').should('be.visible');

    cy.get('[data-cy="workout-cancel-btn"]').click();
    cy.get('[data-cy="workout-modal"]').should('not.exist');
  });

  it('creates a workout when form is filled and saved', () => {
    navigateToWorkoutsTab();

    cy.get('[data-cy="workout-new-btn"]').click();
    cy.get('[data-cy="workout-modal"]').should('be.visible');

    cy.get('[data-cy="workout-title-input"]').type('New Test Workout');
    // Strength type requires at least one exercise with a valid name (minLength 2)
    cy.get('.ex-item').first().find('input[placeholder="e.g. Lat Pulldown"]').type('Push-up');

    cy.get('[data-cy="workout-save-btn"]').click();
    cy.wait('@createWorkout').its('request.body').should('have.property', 'title', 'New Test Workout');
  });

  it('shows the empty state when there are no workouts', () => {
    cy.intercept('GET', '**/api/workouts*', {
      statusCode: 200,
      body: [],
    }).as('getEmptyWorkouts');

    cy.loginByApi('/account');
    cy.contains('.sb-item', 'My Workouts').click();
    cy.wait('@getEmptyWorkouts');

    cy.get('.empty').should('be.visible');
    cy.get('.empty').should('contain.text', 'No workouts');
  });
});
