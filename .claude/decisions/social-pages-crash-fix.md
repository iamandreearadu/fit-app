# ADR: Social Pages Crash Fix

## Date
2026-06-24

## Status
Applied

## Context
User reported social pages "load very slowly or not at all" — feed, discover, profile, and all other routes under `/social` were either blank or crashed.

## Root Cause Analysis

### Bug 1: ConversationService type mismatch (CRITICAL — crash)

**Backend** `GET /api/conversations` returns `PaginatedResponse<ConversationSummaryResponse>`:
```json
{"items": [...], "page": 1, "pageSize": 20, "totalCount": 0, "hasMore": false}
```

**Frontend** `ConversationService.getConversations()` declared the return as `Observable<ConversationSummary[]>` and deserialized the full paginated object as if it were a flat array.

**Cascade failure:**
1. `ChatFacade.loadConversations()` → `this.conversations.set(paginatedObject)`
2. `unreadConversationsCount = computed(() => this.conversations().filter(...))` → **TypeError: filter is not a function**
3. `SocialShellComponent` template reads `chatFacade.unreadConversationsCount()` on desktop → **CRASH** → shell fails → all child routes blank
4. `AppBottomNavComponent` template reads `totalUnreadMessages` (uses `.reduce()`) → **CRASH** on mobile global nav

### Bug 2: IntersectionObserver sentinel never attaches (infinite scroll broken)

In both `SocialFeedComponent` and `SocialDiscoverComponent`, the sentinel `<div #sentinel>` lives inside a conditional `@if` block that depends on loaded data. The `@ViewChild('sentinel')` was read once in `ngAfterViewInit()`, but at that point data hadn't loaded yet, so the sentinel didn't exist in the DOM. The observer was never attached → infinite scroll never triggered.

## Fixes Applied

### Fix 1: `fit-app/src/app/api/conversation.service.ts`
```typescript
// BEFORE (broken — PaginatedResponse treated as flat array)
getConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(this.base);
}

// AFTER (extracts items array from paginated response)
getConversations(): Observable<ConversationSummary[]> {
    return this.http.get<PaginatedResponse<ConversationSummary>>(this.base).pipe(
      map(r => r.items)
    );
}
```

### Fix 2: `social-feed.component.ts` — setter-based ViewChild
```typescript
// BEFORE (sentinel not found because @if block hasn't rendered yet)
@ViewChild('sentinel') sentinelRef!: ElementRef;
ngAfterViewInit() { if (this.sentinelRef?.nativeElement) this.observer.observe(...); }

// AFTER (setter fires when sentinel enters DOM after data loads)
@ViewChild('sentinel') set sentinelElement(ref: ElementRef | undefined) {
    if (ref?.nativeElement && this.observer) this.observer.observe(ref.nativeElement);
}
```

### Fix 3: `social-discover.component.ts` — same setter-based ViewChild pattern

## Files Modified
- `fit-app/src/app/api/conversation.service.ts` — extract `.items` from PaginatedResponse
- `fit-app/src/app/features/social/feed/social-feed.component.ts` — setter ViewChild for sentinel
- `fit-app/src/app/features/social/discover/social-discover.component.ts` — setter ViewChild for sentinel

## Consequences
- Social pages no longer crash on desktop or mobile
- Infinite scroll works in both feed and discover
- No backend changes needed — the API contract was correct, the frontend deserialization was wrong
