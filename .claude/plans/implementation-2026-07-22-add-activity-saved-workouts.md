# NovaFit — Implementare Add Activity cu workout-uri salvate

**Data:** 2026-07-22  
**Status:** Implementat și verificat  
**Plan sursă:** `.claude/decisions/add-activity-saved-workouts-plan-2026-07-22.md`

## Rezultat

Pagina dedicată New Post permite acum atașarea unui workout personal salvat. Activitatea poate fi singurul conținut al postării sau poate fi combinată cu imagine și caption. Postarea rezultată folosește mecanismul existent `linkedWorkoutId` și afișează preview-ul workout-ului în suprafețele social existente.

Asocierea reprezintă un workout salvat (`WorkoutTemplate`), nu confirmarea unei sesiuni executate. Eticheta rămâne `WORKOUT`; fluxul separat `Share to beSocial` continuă să reprezinte workout-urile finalizate.

## Implementare frontend

### New Post

În `CreatePostComponent` au fost adăugate:

- secțiunea `Activity` sub Caption;
- acțiunea `Add activity`;
- preview compact pentru workout-ul selectat;
- schimbarea workout-ului prin apăsarea preview-ului;
- eliminarea activității fără pierderea imaginii sau caption-ului;
- suport pentru publicarea unei postări care conține doar workout-ul;
- includerea `linkedWorkoutId` în `CreatePostRequest`;
- păstrarea selecției dacă publicarea eșuează.

### Workout picker

Selectorul este implementat responsive:

- dialog compact, centrat, pe desktop;
- bottom sheet pe mobil;
- limită de înălțime raportată la `100dvh` și safe area;
- scrollbar ascuns vizual, cu scroll funcțional;
- blocarea scrollului paginii din spate;
- încărcare lazy la prima deschidere;
- cache local cât timp composer-ul rămâne deschis;
- căutare locală case-insensitive după titlu;
- selecție unică și confirmare explicită;
- loading skeleton;
- empty state pentru lipsa workout-urilor personale;
- search-empty state;
- error state cu `Try again`;
- `Cancel` fără modificarea selecției confirmate.

### Accesibilitate

- controale cu target tactil de minimum 44px;
- dialog cu `aria-modal` și titlu asociat;
- listă cu semantică `radiogroup` / `radio`;
- selecție exprimată și prin icon, nu numai prin culoare;
- închidere cu `Escape`;
- focus mutat în search după deschidere;
- focus trap cu `Tab` și `Shift+Tab`;
- focus returnat la controlul care a deschis selectorul;
- focus-visible pentru toate acțiunile;
- suport `prefers-reduced-motion`.

### Sursa workout-urilor

În `WorkoutsTabService` a fost adăugat `listSavedTemplates()`:

- cere până la 50 de template-uri pentru selector;
- mapează DTO-urile prin logica existentă;
- exclude explicit `isSystemTemplate = true`;
- returnează doar workout-uri eligibile pentru asociere.

## Implementare backend

Validarea din `SocialService.CreatePostAsync` diferențiază acum:

- workout existent și deținut de utilizator — acceptat;
- workout al altui utilizator — `403 Forbidden`;
- template global nesalvat — `403 Forbidden`;
- workout inexistent sau șters — `404 Not Found`.

`SocialController.CreatePost` tratează explicit `KeyNotFoundException` și returnează `404` cu un mesaj controlat.

Nu a fost necesară o migrare. Au fost reutilizate:

- `CreatePostRequest.LinkedWorkoutId`;
- `Post.LinkedWorkoutId`;
- relația EF Core cu `DeleteBehavior.SetNull`;
- `LinkedContentPreview` și mapping-ul existent pentru titlu, durată și tip.

## Decizii UI aplicate

- violetul NovaFit este rezervat pentru selecție și acțiunea principală;
- selectorul folosește suprafețe dark cu diferențe mici de elevație;
- separarea elementelor este realizată prin bordere cu opacitate redusă;
- informația este prezentată în ordinea: tip → titlu → metadata;
- controalele folosesc ritmul de spațiere 4/8/12/16px;
- workout-ul atașat este o bandă contextuală compactă, nu un card greu sau un formular secundar.

## Fișiere modificate

- `fit-app/src/app/features/social/components/create-post/create-post.component.ts`
- `fit-app/src/app/features/social/components/create-post/create-post.component.html`
- `fit-app/src/app/features/social/components/create-post/create-post.component.css`
- `fit-app/src/app/features/social/components/create-post/create-post.component.spec.ts`
- `fit-app/src/app/api/workouts-tab.service.ts`
- `FitApp.Api/Services/SocialService.cs`
- `FitApp.Api/Controllers/SocialController.cs`
- `FitApp.Api.Tests/AddActivityPostTests.cs`

## Teste adăugate

### Angular — 4 teste

- încărcare lazy și filtrare după titlu;
- activarea publicării pentru postare doar cu workout;
- trimiterea ID-ului selectat prin `linkedWorkoutId`;
- eliminarea workout-ului fără ștergerea restului draft-ului.

### API — 4 teste

- postare creată doar cu workout personal;
- respingerea workout-ului altui utilizator;
- `404` pentru workout inexistent;
- respingerea template-ului global nesalvat.

## Verificări executate

```text
npm run build
Rezultat: SUCCESS

npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/features/social/components/create-post/create-post.component.spec.ts
Rezultat: 4/4 SUCCESS

dotnet test FitApp.Api.Tests/FitApp.Api.Tests.csproj --configuration Release
Rezultat: 33/33 PASSED

git diff --check [fișierele implementării]
Rezultat: fără erori de whitespace
```

## Corecție viewport după implementare

Selectorul era inițial raportat la containerul scrollabil al paginii când utilizatorul îl deschidea înainte să ajungă la finalul formularului. Cauza era animația `slideUp` de pe `.social-content`, care păstra un `transform` după finalizare și transforma acel element în containing block pentru descendenții `position: fixed`.

Pentru ruta New Post, animația și transformul rezidual sunt dezactivate în `social-shell.component.css`. Backdrop-ul și bottom sheet-ul sunt acum raportate direct la viewport și rămân integral vizibile indiferent de poziția scrollului.

## Criterii de acceptare îndeplinite

- utilizatorul poate deschide `Add activity` din New Post;
- sunt afișate doar workout-urile personale salvate;
- lista are loading, empty, search-empty, error și retry;
- workout-ul poate fi selectat, schimbat și eliminat;
- o postare poate conține numai workout-ul;
- ID-ul corect este validat și salvat server-side;
- ownership-ul nu poate fi ocolit din request;
- preview-ul folosește contractul social existent;
- selectorul este adaptat pentru desktop și mobil;
- build-ul și toate testele relevante trec.
