# Implementare audit Social Profile — 2026-07-21

## Scope

Prima etapă de implementare bazată pe `audit-2026-07-21-social-profile.md`, limitată la `Social/Profile`, state-ul și endpointurile consumate direct de această pagină.

## Agenți folosiți

- Angular developer: facade, concurență, paginare și teste.
- UI/UX + Angular developer: componenta principală, accesibilitate și flow-uri.
- Test engineer + Angular developer: Stats și testele aferente.
- Agent principal: integrare, endpoint Articles arhivate, ruta `me`, build și verificare finală.

## Probleme rezolvate

### Corectitudinea datelor

- State-ul profilului este resetat atomic la schimbarea utilizatorului.
- Fiecare resursă folosește request identity; răspunsurile întârziate pentru profilul anterior sunt ignorate.
- Identitatea profilului și Posts au loading/error separate. O eroare Posts nu mai ascunde headerul profilului.
- Stats se resetează și se reîncarcă la fiecare schimbare `userId`; răspunsurile stale sunt ignorate.
- Ruta `/social/profile/me` așteaptă reactiv hidratarea User/Auth store și nu mai trimite request cu ID gol.
- Follow/Unfollow actualizează atomic `isFollowedByMe` și `followersCount`.

### State, erori și mutații

- Loading și error sunt separate pentru Posts, Workouts, Articles și fiecare categorie Archived.
- Fiecare secțiune afișează eroare contextuală și Retry.
- Mutațiile au stare pending per acțiune, protecție la dublu click și eroare disponibilă în facade.
- Bio are saving state, contor și feedback de eroare.
- Avatarul validează JPEG/PNG/WebP și limita de 2 MB, afișează upload state și eroare inline.

### Paginare

- Posts, Workouts și Articles au `hasMore`, pagină proprie, deduplicare și acțiune Load more.
- Archived Posts, Workouts și Articles au aceeași infrastructură de paginare.
- Follow list păstrează paginarea existentă și beneficiază de resetarea sigură a contextului.

### Articles arhivate end-to-end

- Adăugat endpoint owner-only `GET /api/social/profile/{userId}/blogs/archived`.
- Adăugat contractul în `ISocialService` și query paginat în `SocialService`.
- Adăugată metoda Angular `SocialService.getArchivedBlogs()`.
- Facade-ul expune `archivedBlogs`, loading/error/hasMore, load, load more și unarchive.
- UI Archived afișează articolele, permite restaurarea/ștergerea și oferă stări loading/error/empty.

### Accesibilitate și interacțiune

- Tabs folosesc `tablist`, `tab`, `tabpanel`, `aria-selected` și relațiile ARIA necesare.
- Tabs pot fi navigate cu Arrow Left/Right, Home și End.
- Postările și rândurile de utilizatori pot fi activate din tastatură.
- Butoanele icon au etichete accesibile și targeturi tactile de 44–48 px.
- Dialogul Followers/Following declară semantică de dialog, se închide cu Escape și restaurează focusul.
- Avatarul editabil este accesibil din tastatură.
- Focus-visible și feedbackurile dinamice au fost uniformizate.

### Stats

- Eliminate cardurile placeholder `Avg Calories` și `Weight Change`.
- Layout owner/visitor unificat în jurul metricilor reale.
- Eliminate culorile inline; UI folosește tokenii existenți, inclusiv pentru Chart.js.
- Graficul are sumar textual accesibil, iar canvas-ul este decorativ pentru screen reader.
- Chart.js și CSS respectă `prefers-reduced-motion`.
- Lista recent workouts are markup semantic îmbunătățit.

## Fișiere modificate

### Backend

- `FitApp.Api/Controllers/SocialController.cs`
- `FitApp.Api/Services/ISocialService.cs`
- `FitApp.Api/Services/SocialService.cs`

### Frontend

- `fit-app/src/app/api/social.service.ts`
- `fit-app/src/app/core/facade/social-profile.facade.ts`
- `fit-app/src/app/core/facade/social-profile.facade.spec.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.html`
- `fit-app/src/app/features/social/social-profile/social-profile.component.css`
- `fit-app/src/app/features/social/social-profile/stats-tab/stats-tab.component.ts`
- `fit-app/src/app/features/social/social-profile/stats-tab/stats-tab.component.html`
- `fit-app/src/app/features/social/social-profile/stats-tab/stats-tab.component.css`
- `fit-app/src/app/features/social/social-profile/stats-tab/stats-tab.component.spec.ts`

## Verificări efectuate

- `dotnet build FitApp.Api/FitApp.Api.csproj --no-restore -p:UseAppHost=false -o <output-separat>`: succes, 0 warnings, 0 errors.
- Buildul standard backend a fost inițial blocat exclusiv de instanța API deja pornită, care ținea `FitApp.Api.exe` deschis; procesul utilizatorului nu a fost oprit.
- `npm run build -- --configuration development`: succes.
- Teste targetate facade + Stats în ChromeHeadless: 10/10 succes.
- Agentul facade a rulat și suita Angular existentă: 66/66 succes la checkpointul său.
- `git diff --check`: fără erori de whitespace.

## Elemente păstrate intenționat

- Tema dark NovaFit, Poppins, tokenii și accentul violet existent.
- Separarea owner/visitor și regulile de privacy pentru Stats.
- Dialogurile existente Create/Edit/Delete și flow-urile de navigare actuale.
- Modificările preexistente din restul workspace-ului nu au fost atinse.

## Rămâne pentru etapa următoare

- Descompunerea componentei monolitice în tab components dedicate.
- Alegerea și eliminarea/integrerea componentelor alternative nefolosite (`profile-hero`, `athlete-stats-bar`, `activity-grid`, `private-stats`, `recent-performance`).
- Persistarea tabului și a poziției de scroll în URL/history la revenirea din detail/edit.
- Audit privacy de produs pentru afișarea calories în Workouts publice.
- Migrarea completă a meniurilor custom rămase la Angular Material Menu/Dialog.
- Teste de componentă suplimentare pentru dialogul Followers, avatar, bio și navigarea tabs.

## Rezultat

Problemele P0 de state stale, Stats stale, coupling profile/posts și follow counter sunt închise. Principalele flow-uri P1 — erori contextuale, paginare, protecția mutațiilor, Articles arhivate și ruta `me` — sunt implementate. Refactorul arhitectural mare este separat intenționat pentru a nu transforma stabilizarea funcțională într-un redesign riscant.
