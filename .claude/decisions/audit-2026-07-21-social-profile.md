# Audit Social Profile — NovaFit / beSocial

**Data auditului:** 2026-07-21  
**Scope strict:** `fit-app/src/app/features/social/social-profile/**`, împreună cu facade-ul, modelele și endpointurile consumate direct de acest feature.  
**Nu intră în scope:** feed, discover, chat UI, post detail și backend-ul general, exceptând punctele de integrare apelate din Social Profile.  
**Tip audit:** UX/UI, funcțional, state management, responsive, accesibilitate și mentenabilitate.  
**Status:** audit finalizat; nu s-a modificat codul aplicației.

## Rezumat executiv

Social Profile are o bază funcțională bună: diferențiază profilul propriu de cel vizitat, oferă follow/message, editare bio/avatar, Posts, Workouts, Articles, Stats, followers/following și archive management. Sunt implementate empty/loading/error states pentru o parte importantă din experiență, iar datele sensibile sunt separate de statisticile publice.

Totuși, feature-ul are trei probleme structurale:

1. **Starea este globală și insuficient resetată între profiluri.** La navigare între utilizatori pot apărea temporar sau persistent datele profilului anterior.
2. **Fluxurile sunt implementate neuniform.** Posts, Workouts și Articles folosesc trei modele vizuale și trei tipuri diferite de acțiuni; arhivarea nu este completă pentru Articles.
3. **Există două arhitecturi UI concurente.** Componentele noi `profile-hero`, `athlete-stats-bar`, `activity-grid`, `private-stats` și `recent-performance` există, dar pagina reală reconstruiește manual aceeași experiență și nu le folosește.

Recomandarea principală este stabilizarea flow-urilor și a state-ului înainte de redesignul vizual amplu.

## Harta experienței actuale

### Intrare pe profil

- Ruta citește `userId`; valoarea `me` este transformată în ID-ul utilizatorului autentificat.
- În paralel sunt încărcate profilul + postările, workouts și articles.
- Tabul inițial este întotdeauna `Posts`.
- Workouts și Articles sunt încărcate chiar dacă utilizatorul nu deschide taburile respective.
- Stats se încarcă lazy când componenta tabului este creată.

### Profil propriu

- Avatar editabil prin upload local base64.
- Bio adăugabil/editabil inline.
- Acțiune principală `Create`.
- Meniu secundar cu Edit Bio și Archived.
- Posts: create, edit, archive, delete.
- Workouts: edit, archive, delete.
- Articles: create, edit, archive, delete.
- Stats: streak, workouts, weekly volume, recent workouts și două metrici placeholder.

### Profil vizitat

- Follow / Following.
- Message, cu creare de conversație și fallback către lista de chat.
- Followers/following pot fi deschiși și permit follow/unfollow pentru utilizatorii din listă.
- Conținutul propriu al vizitatorului nu primește acțiuni de editare.
- Stats afișează doar statisticile publice și nota de confidențialitate.

## Constatări prioritizate

### P0 — Corectitudine și consistența datelor

#### 1. Date vechi pot rămâne vizibile când se schimbă profilul

`SocialProfileFacade` nu golește `currentProfile`, `profilePosts`, `profileWorkouts`, `profileBlogs`, erorile și listele auxiliare înainte de încărcarea unui alt `userId`. Cererile vechi nu sunt anulate și nu există verificarea că răspunsul aparține ultimei rute active.

**Impact:** la navigare rapidă A → B, utilizatorul poate vedea temporar datele lui A sub URL-ul lui B; un răspuns lent poate suprascrie datele profilului curent.

**Recomandare:** state reset atomic la schimbarea ID-ului și request identity/cancellation cu `switchMap` sau token incremental. Facade-ul trebuie să publice un state per profil sau să ignore răspunsurile stale.

#### 2. Stats poate rămâne pe utilizatorul anterior

`StatsTabComponent` încarcă datele numai în `ngOnInit()`. Dacă ruta schimbă `userId` cât timp tabul Stats rămâne montat, schimbarea inputului nu declanșează o nouă încărcare.

**Impact:** statisticile unui utilizator pot fi afișate pe profilul altuia; este și o problemă de privacy/correctness.

**Recomandare:** input signal + `effect`, `ngOnChanges`, sau routing-driven facade load; resetarea `publicStats` trebuie făcută pentru noul ID înainte de request.

#### 3. Profilul și postările sunt tratate ca o singură cerere logică

`loadProfile()` folosește `Promise.all(getProfile, getProfilePosts)`. Dacă postările eșuează, profilul întreg intră în error state chiar dacă datele de identitate au fost încărcate corect.

**Impact:** o eroare secundară face inutilizabil întregul profil, inclusiv Follow și Message.

**Recomandare:** separarea `profileIdentityState` de `profilePostsState`; headerul trebuie să rămână disponibil când doar Posts eșuează.

#### 4. Follow/unfollow nu actualizează complet profilul local

`toggleFollow()` schimbă numai signalul local `isFollowing`. Răspunsul conține `followersCount`, dar `currentProfile.followersCount` nu este actualizat.

**Impact:** butonul se schimbă, însă counterul Followers rămâne vechi până la reload. În lista followers/following se face reload separat, fără await și fără stare contextuală.

**Recomandare:** patch atomic pentru `isFollowedByMe` și `followersCount` în `currentProfile`; un singur source of truth pentru follow state, nu signal duplicat în componentă.

### P1 — Flow-uri incomplete sau fragile

#### 5. Articles arhivate nu pot fi găsite și restaurate

Pagina permite `archiveBlog()`, iar articolul este eliminat din lista activă. Secțiunea Archived încarcă și afișează doar posts și workouts; facade-ul nu are `archivedBlogs` și nici `unarchiveBlog`.

**Impact:** pentru utilizator, articolul arhivat pare pierdut definitiv.

**Recomandare:** adăugarea archived articles end-to-end sau eliminarea temporară a acțiunii Archive din Articles până când flow-ul este complet.

#### 6. Erorile Workouts/Articles sunt stocate, dar nu sunt afișate

`profileSectionsError` este setat de încărcările workouts/blogs/archived, însă template-ul principal nu îl consumă. În plus, un singur string de eroare este împărțit între toate secțiunile.

**Impact:** utilizatorul primește empty state și poate interpreta o eroare de rețea ca lipsă de conținut; nu există Retry contextual.

**Recomandare:** state separat per tab (`workouts`, `articles`, `archive`) cu error + retry în secțiunea afectată.

#### 7. Loading-ul Workouts și Articles este comun

`profileSectionLoadingCount` produce un singur `isLoadingProfileSections`. Dacă una dintre cereri este lentă, ambele taburi pot afișa skeleton, chiar dacă datele unuia sunt deja disponibile.

**Impact:** feedback imprecis și UI care pare mai lent decât este.

**Recomandare:** loading state separat per resursă; încărcare lazy la prima activare de tab și cache ulterior.

#### 8. Nu există pagination/load more pentru conținutul profilului

Posts, Workouts și Articles consumă doar primul răspuns paginat. Follow list are pagination, dar conținutul profilului nu oferă load more sau infinite scroll.

**Impact:** profilurile active par incomplete, iar counterul Posts poate să nu corespundă cu grila vizibilă.

**Recomandare:** cursor/page per tab, load more contextual și păstrarea poziției la revenire din detail.

#### 9. Mutațiile nu au stări locale coerente

Bio, avatar, archive, delete, follow și article actions nu au toate loading/disabled/error handling. Majoritatea excepțiilor ajung necontrolat la componentă, iar clickurile repetate pot trimite cereri duplicate.

**Impact:** dublu-submit, feedback absent și posibilă stare locală divergentă după eroare.

**Recomandare:** mutation state per item/action, buton disabled, feedback succes/eroare și rollback/reload controlat.

#### 10. Avatar upload validează doar dimensiunea

Uploadul acceptă `image/*`, dar logica verifică doar limita de 2 MB și prefixul rezultatului după FileReader. Nu există validare MIME înainte de citire, stare de upload, compresie sau gestionare explicită a erorii FileReader/API.

**Impact:** feedback slab, cost mare de payload base64 și experiență fragilă pe mobil.

**Recomandare:** MIME allowlist JPEG/PNG/WebP, loading, try/catch, compresie/redimensionare client-side sau upload de fișier dedicat.

#### 11. `me` poate rezolva la ID gol

Dacă store-urile de user/auth nu sunt încă hidratate, ruta `me` poate apela facade-ul cu `''`.

**Impact:** request invalid și error state fals la refresh/deep link.

**Recomandare:** așteptarea hidratării autentificării sau endpoint dedicat `/profile/me` care nu depinde de ID-ul client-side.

## Audit pe taburi

### Posts

**Ce funcționează bine**

- Empty state diferit owner/visitor.
- Create post accesibil direct proprietarului.
- Grid vizual potrivit conținutului social.
- Fallback pentru postări fără imagine și pentru imagini defecte.
- Edit/archive/delete sunt protejate de owner state.

**Ce trebuie îmbunătățit**

- Celulele au `role="button"` și `tabindex`, dar nu au handler Enter/Space.
- Acțiunile overlay apar prin hover; trebuie verificată și garantată vizibilitatea pe touch.
- Butoanele icon folosesc `title`, nu `aria-label` contextual.
- Overlay-ul conține butoane în interiorul unei suprafețe cu rol de button, producând o structură interactivă ambiguă.
- Alt text-ul `Post {id}` nu descrie imaginea.
- După edit trebuie garantată actualizarea grilei; flow-ul nu este explicit în componenta paginii.
- Lipsesc pagination, like/comment indicators și stare contextuală la delete/archive.

**Direcție UX:** cardul întreg devine link semantic către detail; owner actions sunt un meniu separat, mereu accesibil la focus și touch.

### Workouts

**Ce funcționează bine**

- Owner actions și visitor view sunt separate.
- Empty state-ul owner oferă traseu către Workouts.
- Sunt afișate tipul, durata și estimarea calorică.

**Ce trebuie îmbunătățit**

- Cardurile nu deschid un preview/detail și nu oferă Start/Use template.
- Edit navighează către `/workouts/:id/edit`; trebuie verificat că ruta există și că întoarcerea păstrează tabul activ.
- Caloriile estimate sunt afișate public, deși alte contracte social omit explicit date calorice pentru privacy. Necesită decizie de produs/privacy consecventă.
- Loading și error nu sunt specifice tabului.
- Icon buttons au target de aproximativ 32px, sub recomandarea 44–48px.
- Archive nu oferă confirmare/success consistent; Delete are confirmare.

**Direcție UX:** rând compact cu titlu, tip, durată și o singură acțiune principală; restul în overflow menu. Clarificarea explicită a vizibilității publice pentru calories.

### Articles

**Ce funcționează bine**

- Create/edit folosesc același dialog.
- Articolele au category, author, date, image și preview expandabil.
- Există traseu către article detail.

**Ce trebuie îmbunătățit**

- Archive este un dead end deoarece nu există archived articles UI.
- Interacțiunea este redundantă: card/body click, Read more și Open article concurează.
- `Open article` apare numai după expandare, crescând inutil numărul de pași.
- Meniul custom nu declară roluri menu/menuitem, focus management sau închidere Escape.
- Există multe stiluri inline și două patternuri CSS pentru articles (`article-*` și `blog-post-*`), semn de implementare duplicată.
- Footerul social este ascuns până la wiring pentru like/comment; diferența față de Posts poate crea așteptări neclare.

**Direcție UX:** click pe titlu/card deschide articolul; excerpt expandabil doar dacă este necesar; overflow menu owner; archive disponibil numai când poate fi restaurat.

### Stats

**Ce funcționează bine**

- Separă owner și visitor.
- Pentru visitor nu expune weight/calorie data și explică privacy.
- Weekly Volume are loading, empty și error state.
- Recent workouts folosesc date reale.

**Ce trebuie îmbunătățit**

- Risc critic de date stale la schimbarea `userId`.
- Pe profil propriu sunt afișate două carduri cu `—`: Avg Calories și Weight Change. Acestea par funcții defecte, nu roadmap.
- Owner și visitor dublează mult markup și styling.
- Culorile sunt hardcodate inline, în afara sistemului de tokens.
- Chart.js nu respectă explicit `prefers-reduced-motion` și recreează config/date formatting la nivel local.
- Canvas-ul are doar un aria-label generic; nu oferă sumar textual al trendului.
- Recent workout rows nu sunt interactive și nu clarifică dacă pot fi deschise.

**Direcție UX:** eliminarea metricilor fără date până la suport backend; un singur layout cu vizibilitate condiționată per metric; sumar textual pentru chart și reload sigur la schimbarea profilului.

### Archived

**Ce funcționează bine**

- Este limitat la owner.
- Posts și Workouts pot fi restaurate sau șterse.
- Are back navigation explicit.

**Ce trebuie îmbunătățit**

- Articles lipsesc complet.
- Încărcările Posts/Workouts împart loading/error state.
- Secțiunea înlocuiește tabs fără integrare în URL sau browser Back.
- Nu există empty state separat pe tip și nici confirmare pentru restore.
- La unarchive, elementul este doar eliminat din archive state; lista activă nu este actualizată până la reload/tab revisit.

### Followers / Following

**Ce funcționează bine**

- Pagination și Load more există.
- Poți naviga spre profil și face follow/unfollow inline.
- Lista se golește la închidere.

**Ce trebuie îmbunătățit**

- Containerul custom trebuie să aibă `role="dialog"`, `aria-modal`, titlu asociat, focus trap, Escape și return focus.
- User rows au role button/tabindex, dar nu au garantat Enter/Space.
- Follow per row nu are loading individual, deci poate fi apăsat repetat.
- Nu există deduplicare la pagination sau protecție față de răspunsuri out-of-order.
- Follow/unfollow din listă declanșează reload de profil fără await și poate produce cereri concurente.
- Empty/error sunt tratate diferit; eroarea este toast, fără Retry în dialog.

## Header, bio și acțiuni

### Ierarhie vizuală

- Headerul actual este simplu și lizibil, dar centrările avatar/name/bio plus acțiunile și stats creează mult spațiu vertical pe mobil.
- Stats row și tabs au greutate vizuală similară, iar separarea dintre identitate și conținut este slabă.
- `profile-hero` și `athlete-stats-bar` oferă deja o arhitectură alternativă, dar nu sunt montate; trebuie aleasă o singură direcție.

### Bio

- Show more/less este util.
- Textarea are `outline: none` fără un focus ring vizibil suficient.
- Lipsesc limită vizibilă de caractere, `maxlength`, saving state și error inline.
- După salvare nu există confirmare accesibilă `aria-live`.

### Avatar

- Wrapperul clickabil este `div`, fără keyboard semantics și fără aria-label de editare.
- Overlay-ul camerei este doar vizual.
- Image fallback este manipulat direct prin DOM și `style.display`, în loc de state Angular.

### Follow și Message

- Follow are protecție împotriva dublu click la nivel principal.
- Counterul nu este sincronizat cu răspunsul.
- Message folosește fallback către lista de chat, dar ascunde motivul erorii; utilizatorul nu știe dacă conversația a fost creată.

## Accesibilitate

### Probleme majore

- Tabs nu folosesc `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` și panel `role="tabpanel"`.
- Nu există navigare cu săgeți între tabs.
- Mai multe elemente cu `role="button"` răspund doar la click sau Enter, nu și Space.
- Custom overlays/menus nu gestionează focusul, Escape și return focus.
- Avatarul editabil nu este focusabil.
- Majoritatea icon buttons folosesc `title` în loc de `aria-label` specific.
- Unele targeturi interactive sunt 30–36px, sub 44–48px.
- Focus states sunt inconsistente; bio textarea elimină outline.
- Mesajele loading/save/mutation nu folosesc consecvent `aria-live`.

### Recomandare

Folosește elemente native (`button`, `a`) în loc de `div role=button`, Angular Material Dialog/Menu pentru overlay-uri și implementează patternul complet ARIA tabs.

## Responsive și claritate vizuală

- Posts grid este potrivit pe mobil, dar owner actions bazate pe hover trebuie înlocuite cu overflow menu vizibil.
- Workouts folosesc cards, Articles folosesc feed editorial, Stats folosește dashboard cards; diferența poate fi intenționată, însă tokens, spacing și action placement trebuie uniformizate.
- Profile page are multe valori hardcodate și style attributes, în special Stats și skeletons.
- Componentele neutilizate indică un redesign început și nefinalizat. Menținerea ambelor implementări crește drift-ul și bundle-ul.
- Recomandare vizuală: profil flat, identity header compact, stats bar, tab underline sticky, conținut fără card exterior; culoarea violet doar pentru active/action, nu pentru fiecare icon box.

## Mentenabilitate și arhitectură

### Probleme

- `SocialProfileComponent` gestionează routing, toate taburile, bio, avatar, follow, chat, archive, post/workout/blog CRUD și mai multe overlay-uri. Este prea mare și greu de testat.
- Nu există spec-uri dedicate pentru `social-profile` sau subcomponentele sale în folderul auditat.
- Există componente neutilizate care dublează concepte din pagina monolitică.
- `isFollowing` duplică `currentProfile.isFollowedByMe`.
- Loading/error state este agregat prea larg.
- Meniurile și modalurile custom repetă infrastructură disponibilă în Material.

### Recomandare de structură

1. `SocialProfileShellComponent`: route, identity state, tabs.
2. `ProfileHeaderComponent`: avatar, bio, follow/message.
3. `ProfilePostsTabComponent`.
4. `ProfileWorkoutsTabComponent`.
5. `ProfileArticlesTabComponent`.
6. `ProfileStatsTabComponent`.
7. `ProfileArchiveDialogComponent`.
8. `FollowListDialogComponent`.
9. Facade cu resource states separate și request cancellation.

Componentele existente `profile-hero`, `athlete-stats-bar`, `activity-grid`, `private-stats`, `recent-performance` trebuie fie integrate și finalizate, fie eliminate după migrare; nu trebuie păstrate ca a doua implementare paralelă.

## Ce funcționează bine și trebuie păstrat

- Separarea owner/visitor.
- Restricționarea statisticilor private și mesajul privacy pentru visitor.
- Empty states diferențiate.
- Confirm dialog pentru delete.
- Create/edit dialogs deja reutilizabile.
- Follow list pagination.
- Broken-image fallback pentru Posts.
- Bio expandable.
- Încărcarea paralelă inițială, după ce este făcută sigură pentru route changes.
- Tokenii Nova folosiți în subcomponentele noi.

## Plan recomandat de remediere

### Faza 1 — Corectitudine (obligatoriu)

1. Reset/cancel state la schimbarea `userId`.
2. Reload Stats la input change.
3. Separă profile identity de Posts loading/error.
4. Patch complet follow state și followers count.
5. Afișează errors și Retry per tab.
6. Închide flow-ul archived Articles sau ascunde Archive.
7. Mutation loading/error și protecție double-submit.

### Faza 2 — Accesibilitate și flow

1. ARIA tabs complet + keyboard arrows.
2. Transformă suprafețele clickabile în linkuri/butoane native.
3. Material Dialog/Menu pentru followers și overflow actions.
4. Touch targets minimum 44px.
5. Avatar și bio accesibile din tastatură, cu feedback live.
6. Păstrează tabul și scroll position la revenirea din detail/edit.

### Faza 3 — Simplificare UI

1. Identity header compact, în aceeași temă cu restul aplicației.
2. Unifică action placement pentru Posts/Workouts/Articles.
3. Elimină metricile placeholder din Stats.
4. Elimină style-urile inline și hardcoded colors.
5. Adoptă sau elimină componentele alternative neutilizate.
6. Lazy loading/pagination per tab.

### Faza 4 — Testare

Adaugă teste pentru:

- route `me` și profil vizitat;
- schimbare rapidă de `userId` și anularea răspunsurilor stale;
- owner/visitor permissions în template;
- follow count/state și double click;
- bio save/error/cancel;
- avatar invalid type/size/API error;
- Posts keyboard navigation și CRUD;
- Workouts loading/error/archive/delete;
- Articles create/edit/archive/restore/delete;
- Stats reload la schimbarea userului și privacy;
- follow list pagination, error și focus management;
- tab keyboard navigation și URL state;
- mobile touch actions și overlays.

## Criterii de acceptare pentru un Social Profile stabil

- Nicio informație din profilul A nu apare pe profilul B după route change.
- Headerul rămâne funcțional dacă Posts/Workouts/Articles/Stats eșuează separat.
- Follow button și followers count se actualizează împreună.
- Fiecare tab are loading, error, empty și retry propriu.
- Orice element arhivat poate fi găsit și restaurat.
- Toate acțiunile sunt utilizabile cu tastatură și touch.
- Tabs respectă patternul ARIA și pot fi controlate cu săgeți.
- Stats nu afișează metrici false/placeholder și se reîncarcă pentru userul corect.
- Datele private nu ajung pe profilurile vizitatorilor.
- Back din post/article/edit revine la profil, tab și poziție.
- Există teste automate pentru flow-urile owner și visitor.

## Verdict

**Funcționalitate:** bună ca acoperire, dar cu riscuri de state stale și flow-uri incomplete.  
**UX:** utilizabil, însă inconsistent între taburi și insuficient contextual în erori/mutații.  
**UI:** bază potrivită temei NovaFit, dar afectată de implementări paralele, stiluri inline și patternuri diferite.  
**Accesibilitate:** necesită o trecere dedicată, în special tabs, dialogs, keyboard și touch targets.  
**Prioritate recomandată:** Faza 1 înaintea oricărui redesign vizual amplu.
