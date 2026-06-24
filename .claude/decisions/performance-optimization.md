# ADR: Performance Optimization — Slow Data Loading

## Date
2026-06-24

## Context
Application suffers from slow data loading across multiple pages:
- Dashboard page makes 4+ sequential HTTP requests
- Social profile makes 4 parallel but uncoordinated HTTP requests  
- ConversationService has N+1 query pattern (1 SQL per conversation for unread count)
- DashboardService was never registered in DI container (crash on every request)
- No response compression configured
- Missing database indexes on frequently queried columns
- Streak computation loads entire user history

## Decision — Applied Fixes

### CRITICAL: DashboardService DI Registration
`Program.cs` was missing `AddScoped<IDashboardService, DashboardService>()`.
GET /api/dashboard/today crashed with DI resolution failure on every request.

### Backend
1. **Response Compression** — Gzip Fastest for JSON responses (~60-70% size reduction)
2. **N+1 Fix** — ConversationService batch unread counts (N queries → 1)
3. **Database Indexes** — MealEntries(UserId, Date), Posts(UserId, IsArchived, CreatedAt)
4. **Streak Optimization** — Limited to last 400 days instead of entire history

### Frontend
5. **DailyUserDataComponent** — Promise.all instead of sequential fire-and-forget
6. **SocialProfileComponent** — Promise.all for profile + workouts + blogs
7. **DashboardFacade.loadTodayData** — Sequential await chain → Promise.all
8. **AccountFacade.init** — Hub connections start parallel with user data loading

## Consequences
- Dashboard endpoint works (was completely broken before)
- Conversation list: N queries → 1 query
- Page load times reduced by parallelizing sequential HTTP calls
- Response payload sizes reduced ~60-70%
