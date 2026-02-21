# FitApp – Project Map

## Routes
Public 
/ → HomePageComponent (landing / entry)
/blog → BlogComponent (lazy loaded)
/blog/:id → BlogPostDetailComponent (lazy loaded)
/workouts → WorkoutsComponent
/openai → OpenaiComponent

Protected – AuthGuard
/user-profile → UserPageComponent
/user-dashboard → DashboardPageComponent

Guest-only – GuestGuard
/login → LoginComponent
/register → RegisterComponent

Fallback
** → redirect /

## Features

## Firestore Collections

## Guards

## Notes / Questions
