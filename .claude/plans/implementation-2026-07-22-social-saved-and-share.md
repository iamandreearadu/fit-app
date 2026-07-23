# NovaFit — implementation Social Saved Posts & Share

Data: 2026-07-22

## Rezultat

- Social Profile folosește exact trei taburi egale: Posts, Workouts și Stats; markup-ul Articles rămas a fost eliminat.
- `PostCardComponent` este folosit în Feed, Discover și Post Detail; Profile și Saved folosesc griduri compacte care deschid Post Detail.
- Footerul postării include Share și Save/Unsave, cu stare optimistă, protecție la dublu click și rollback la eroare.
- Starea Saved este sincronizată între store-urile Feed, Discover și Profile; pagina Saved elimină imediat cardul la Unsave.
- Dropdown-ul profilului propriu conține numai Saved și Archived; ambele pagini oferă grid, loading, empty, error, retry și paginare.

## Share

- `PostShareDialogComponent` oferă lista conversațiilor recente, căutare remote cu debounce 300 ms și anularea răspunsurilor stale, Send/Sent per utilizator, Web Share și Copy Link cu fallback.
- Dialogul rămâne deschis după trimitere și previne retrimiterea accidentală către același utilizator în sesiunea curentă.
- Mesajele `shared_post` sunt randate în Chat ca preview navigabil; postările șterse/arhivate afișează `This post is no longer available`.
- Preview-ul transmis nu expune calories, macros, weight, BMI, BMR/TDEE sau alte date private de sănătate.

## Backend și contracte

- Entitate nouă `SavedPost`, cu unicitate `(UserId, PostId)`, index `(UserId, CreatedAt)` și cascade delete.
- `POST /api/social/posts/{postId}/save` face toggle atomic Save/Unsave.
- `GET /api/social/saved-posts?page=1&pageSize=12` întoarce salvările private, newest-first, exclude postări arhivate și Articles legacy.
- `POST /api/conversations/share-post` reutilizează sau creează conversația directă și emite actualizările realtime/notificarea.
- `DirectMessage` suportă `MessageType = shared_post`, `SharedPostId` și preview availability-safe.
- Migrare: `20260722094451_AddSavedPostsAndSharedPostMessages` plus snapshot actualizat.

## Verificări rulate

- `npm run build` — succes.
- `npm test -- --watch=false` — 66/66 teste frontend trecute.
- `dotnet build FitApp.sln -c Release` — succes, 0 warnings, 0 errors.
- `dotnet test FitApp.Api.Tests/FitApp.Api.Tests.csproj -c Release --no-build` — 29/29 teste trecute.
- `dotnet ef migrations has-pending-model-changes --configuration Release` — fără modificări de model nemigrate.

## Deploy și rollback

- La deploy se aplică migrarea EF înainte de activarea endpointurilor noi.
- Rollback aplicație: revine frontend/backend la versiunea anterioară; datele Saved pot rămâne fără impact asupra funcțiilor vechi.
- Rollback schemă, numai dacă este necesar: `dotnet ef database update 20260721131548_AddPushSubscriptions`; aceasta elimină SavedPosts și coloanele shared-post, deci pierde salvările create între timp.

## Observații

- EF CLI local este 10.0.5, runtime 10.0.10; verificarea modelului trece, dar actualizarea tool-ului este recomandată separat.
- Testele Karma emit avertismente 404 pentru asset-ul de test `assets/fitapp-wb.png`; acestea nu afectează rezultatul (66 SUCCESS).
# UI/UX implementation addendum — 2026-07-22

- Profile Posts remains a three-column media grid; full actions appear in Post Detail.
- Saved Posts is a three-column selectable grid, with text tiles for posts without images and return navigation to `/social/saved`.
- Archived Posts moved to `/social/archived`, uses the same grid language, and exposes compact Restore actions.
- Saved and Archived use the standard contextual top bar on mobile (Back + page title), keep their local headers on desktop, and retain bottom navigation.
- The profile overflow contains only Saved and Archived, has no link underlines, and uses the standard elevated dropdown surface.
- New Post is a dedicated `/social/new-post` page instead of a dialog; all creation entry points route to it with return navigation, and the page uses a 3:4 media preview, caption counter, file validation, processing state, inline errors, and a mobile sticky Publish action.
- Share is icon-only and is grouped directly beside Save on the right of the opened-post footer.
- Share Post is centered on desktop and becomes a compact floating mobile sheet above the navigation dock, with internal hidden-scrollbar scrolling and safe-area clearance.
- Mobile navigation is a floating 60px pill inset 12px from the sides and bottom safe area. Active state is a centered 44px circle; Home has a 1px optical correction.
- Migration `20260722094451_AddSavedPostsAndSharedPostMessages` was applied locally after Save and Send initially failed against the old schema.

---
