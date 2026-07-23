# NovaFit — Social Profile UI, Share Post și Saved Posts

## Context

Aplicația NovaFit folosește:

- Frontend: Angular 19, standalone components, Signals și Angular Material.
- Backend: ASP.NET Core / .NET 10 și Entity Framework Core.
- Design: dark mode, Poppins, suprafețe discrete, accent violet, componente compacte și responsive.
- Zona vizată: Social Profile, Social Feed, Discover, Post Detail și conversațiile dintre utilizatori.

Articles a fost eliminat din Social. Social Profile trebuie să conțină numai:

1. Posts
2. Workouts
3. Stats

Înainte de implementare:

1. Citește `CLAUDE.md`.
2. Citește documentele relevante din `.claude/design-system`.
3. Citește:
   - `.claude/decisions/business-audit-2026-07-22-social-profile.md`
   - `.claude/plans/implementation-2026-07-22-remove-social-articles.md`
4. Citește agenții relevanți din `.claude/agents`:
   - `angular-developer.md`
   - `dotnet-developer.md`
   - `uiux-designer.md`
   - `test-engineer.md`
   - `security-auditor.md`
5. Analizează implementarea actuală înainte de modificări.
6. Păstrează toate schimbările existente care nu țin de acest task.

## Obiectiv

Implementează:

1. Repararea layoutului taburilor Social Profile pentru exact trei coloane.
2. Un dialog Share în care utilizatorul poate:
   - trimite postarea unui utilizator NovaFit;
   - distribui postarea prin aplicațiile dispozitivului;
   - copia linkul postării.
3. Saved Posts end-to-end.
4. Pagina `/social/saved`.
5. Linkul `Saved` în dropdown-ul `...` al profilului propriu.
6. Save și Unsave folosind același buton.
7. Teste frontend și backend.
8. Documentarea implementării în `.claude/plans`.

## 1. Social Profile — trei taburi

Social Profile trebuie să conțină numai:

- Posts
- Workouts
- Stats

### Cerințe de layout

- Bara trebuie să folosească exact trei coloane egale.
- Fiecare tab ocupă `1fr`.
- Elimină configurațiile CSS rămase pentru patru coloane.
- Nu lăsa spațiul gol al fostului tab Articles.
- Iconul și textul fiecărui tab trebuie centrate.
- Păstrează indicatorul violet pentru tabul activ.
- Păstrează stilul flat și clean.
- Verifică desktop, tabletă și mobile.

### Accesibilitate

Păstrează:

- `role="tablist"`
- `role="tab"`
- `role="tabpanel"`
- `aria-selected`
- `aria-controls`
- navigare cu Arrow Left/Right
- Home/End
- focus vizibil
- touch targets de minimum 44px, preferabil 48px

Navigarea trebuie calculată pentru exact trei taburi.

## 2. Butonul Share sub fiecare Post

Fiecare Post trebuie să aibă un buton Share în footer.

Locații:

- Social Feed
- Discover
- Social Profile → Posts
- Post Detail
- Saved Posts

Folosește aceeași componentă și aceeași logică în toate locațiile.

### Ordinea acțiunilor

Ordine recomandată:

- Like
- Comment
- Share
- Save, aliniat în partea dreaptă

### Design

Butonul Share:

- icon simplu `send` sau iconul deja folosit în aplicație;
- fără background permanent;
- hover/focus subtil;
- aceeași dimensiune ca Like și Comment;
- touch target minimum 44–48px;
- `aria-label="Share post"`.

Apăsarea butonului trebuie să deschidă întotdeauna fereastra internă Share. Nu declanșa direct Web Share API.

## 3. Fereastra Share

### Comportament general

La apăsarea Share se deschide o fereastră cu două zone:

1. Trimitere către utilizatori NovaFit.
2. Alte opțiuni:
   - distribuire prin aplicațiile dispozitivului;
   - copiere link.

Titlu: `Share post`.

### Desktop

Folosește un dialog centrat:

- lățime aproximativă 440–500px;
- max-height adaptat viewportului;
- scroll intern;
- focus trap;
- închidere cu Escape;
- focus return la butonul Share.

### Mobile

Folosește un bottom sheet:

- deschis din partea de jos;
- nu trebuie să intre în spatele bottom navbarului;
- max-height adaptat viewportului;
- scroll intern;
- scrollbar ascuns vizual;
- drag handle subtil, dacă se potrivește componentelor existente;
- buton Close accesibil.

## 4. Trimiterea către un utilizator NovaFit

### Search

În partea de sus a ferestrei:

- search input;
- placeholder `Search people`;
- icon search;
- buton de clear când există text.

Comportament:

- debounce 250–350ms;
- începe căutarea remote după minimum două caractere;
- ignoră răspunsurile stale;
- exclude utilizatorul autentificat;
- deduplică rezultatele;
- păstrează loading, empty și error separat.

### Lista inițială

Înainte ca utilizatorul să caute, afișează:

- conversațiile recente sau;
- utilizatorii urmăriți/relevanți.

Titlu recomandat: `Recent`.

Dacă infrastructura nu oferă conversații recente într-un format reutilizabil, folosește utilizatorii din conversațiile existente.

### Rând utilizator

Fiecare rând trebuie să conțină:

- avatar;
- display name;
- verified badge, dacă există;
- username sau context secundar, dacă este disponibil;
- buton `Send`.

Cerințe:

- întregul rând este accesibil;
- butonul Send are minimum 44–48px;
- există loading individual;
- dublu click nu trimite de două ori.

### După trimitere

La succes:

- `Send` devine `Sent`;
- afișează icon check;
- păstrează dialogul deschis pentru a permite trimiterea către alt utilizator;
- utilizatorul poate închide manual dialogul;
- afișează feedback accesibil `Post sent to {displayName}`.

Nu permite trimiterea repetată accidental către aceeași persoană în aceeași sesiune a dialogului.

## 5. Integrarea cu Chat

La apăsarea Send:

1. Găsește conversația directă existentă.
2. Dacă nu există, creează una.
3. Trimite postarea în conversație.
4. Nu naviga automat din dialog către Chat.
5. Marchează local utilizatorul ca `Sent`.

### Mesaj structurat recomandat

Extinde mesajele pentru a suporta:

```json
{
  "messageType": "shared_post",
  "sharedPostId": 123
}
```

În conversație, mesajul trebuie să afișeze un preview cu:

- autorul postării;
- imaginea, dacă există;
- primele caractere din text;
- linked content, dacă există;
- buton sau suprafață `View post`.

La click: `/social/post/{postId}`.

### Post indisponibil

Dacă postarea a fost ștearsă sau arhivată:

- conversația rămâne validă;
- preview-ul afișează `This post is no longer available`;
- nu produce eroare de pagină sau request repetitiv.

### Privacy

Preview-ul nu trebuie să conțină:

- calories;
- macros;
- weight;
- BMI;
- BMR/TDEE;
- alte date private de sănătate.

Pentru linked workout/meal folosește numai preview-ul privacy-safe existent.

## 6. Alte opțiuni de Share

Sub lista utilizatorilor adaugă o secțiune separată: `Share another way`.

Aceasta trebuie să conțină două acțiuni:

1. `Share via...`
2. `Copy link`

Separă vizual zona de utilizatori prin spacing sau divider subtil.

### Share via...

La apăsare:

- folosește Web Share API dacă este disponibil;
- deschide selectorul nativ al dispozitivului;
- include titlu, text scurt și URL-ul postării.

URL: `{origin}/social/post/{postId}`.

Dacă Web Share API nu este disponibil:

- ascunde acțiunea; sau
- folosește fallback direct către Copy Link.

Nu afișa o eroare tehnică pentru lipsa Web Share API.

### Copy link

La apăsare:

1. copiază linkul în clipboard;
2. iconul se schimbă temporar în check;
3. textul devine `Link copied`;
4. afișează feedback accesibil;
5. după aproximativ două secunde revine la `Copy link`.

Dacă `navigator.clipboard` nu este disponibil, folosește un fallback sigur pentru copiere.

### Design acțiuni

Acțiunile pot fi afișate:

- ca două butoane compacte pe un rând; sau
- două rânduri simple cu icon.

Păstrează:

- icon `ios_share`/`share`;
- icon `link`;
- border subtil;
- fără background puternic;
- text cu weight moderat;
- accent violet numai pentru hover/focus/success.

## 7. Saved Posts — comportament

Utilizatorul autentificat poate salva orice Post disponibil.

Save este privat:

- autorul nu primește notificare;
- salvările nu sunt vizibile public;
- nu afișa public save count.

### Entitate backend

Adaugă `SavedPost` cu:

- `Id`
- `UserId`
- `PostId`
- `CreatedAt`

Constrângeri:

- unique `(UserId, PostId)`;
- index `(UserId, CreatedAt)`.

Cascade behavior:

- ștergerea unui Post elimină salvările asociate;
- ștergerea utilizatorului elimină salvările sale;
- un utilizator nu poate accesa salvările altuia.

Creează migrarea EF Core și actualizează snapshot-ul.

## 8. API Saved Posts

### Toggle Save

Endpoint recomandat:

`POST /api/social/posts/{postId}/save`

Răspuns:

```json
{
  "isSaved": true
}
```

Același endpoint face Save și Unsave.

Reguli:

- operație atomică;
- fără duplicate;
- 404 pentru Post inexistent;
- nu salva Post arhivat;
- sigur la requesturi concurente.

### Lista Saved Posts

`GET /api/social/saved-posts?page=1&pageSize=12`

Răspuns:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 12,
  "totalCount": 0,
  "hasMore": false
}
```

Ordine:

- cele mai recent salvate primele;
- folosește `SavedPost.CreatedAt`.

Reguli:

- numai salvările utilizatorului autentificat;
- exclude postări arhivate sau indisponibile;
- exclude Articles legacy;
- page minimum 1;
- pageSize între 1 și 50;
- `AsNoTracking`;
- fără N+1 queries.

## 9. Starea Post

Extinde DTO-ul Post cu:

```typescript
isSavedByMe: boolean;
```

Câmpul trebuie populat în:

- Feed
- Discover
- Profile Posts
- Post Detail
- Saved Posts

Save/Unsave trebuie sincronizat în:

- SocialFeedFacade
- SocialContentFacade
- SocialProfileFacade
- Post Detail
- SavedPostsFacade

Folosește:

- update imutabil;
- optimistic update;
- rollback la eroare;
- protecție double click;
- protecție împotriva răspunsurilor stale.

## 10. Butonul Save

În footerul fiecărui Post:

- nesalvat: `bookmark_border`
- salvat: `bookmark`
- salvat poate folosi violetul temei
- fără background permanent
- touch target 44–48px
- loading/disabled în timpul requestului

Accesibilitate:

```html
aria-label="Save post"
aria-label="Remove post from saved"
aria-pressed="true|false"
```

În Saved Posts, Unsave elimină cardul din listă. Dacă requestul eșuează, cardul revine în poziția inițială.

## 11. Pagina Saved Posts

Rută: `/social/saved`.

### Header

- back button pe mobile;
- titlu `Saved posts`;
- text opțional `Posts you saved for later`.

### Loading

Skeletons identice sau compatibile cu Feed.

### Empty

- icon bookmark;
- `No saved posts yet`;
- `Save useful posts and find them here later.`;
- CTA `Explore posts`.

### Error

- mesaj inline;
- Retry.

### Success

Folosește `PostCardComponent`.

Acțiuni disponibile:

- Like
- Comment
- Share
- Save/Unsave
- navigare la Post Detail
- edit/delete numai pentru postările proprii
- pagination sau infinite scroll

## 12. Linkul Saved în profil

În dropdown-ul `...` de pe profilul propriu:

1. Edit Bio
2. Saved
3. Archived

Saved:

- icon `bookmark`;
- navighează la `/social/saved`;
- închide meniul înainte de navigare;
- apare numai pe profilul propriu;
- suportă tastatură și focus vizibil.

Nu afișa Saved pe profilul altui utilizator.

## 13. Arhitectură recomandată

Frontend:

- `PostShareDialogComponent`
- `SavedPostsComponent`
- `SavedPostsFacade`
- logică Save centralizată în `SocialContentFacade`
- extensie reutilizabilă pentru `PostCardComponent`

Backend:

- `SavedPost`
- DTO-uri Saved Posts
- endpointuri în SocialController
- metode SocialService sau serviciu dedicat
- suport pentru `shared_post` în conversations/messages

Nu duplica logica între Feed, Discover, Profile, Detail și Saved.

## 14. Accesibilitate

Dialogul Share trebuie să ofere:

- `role="dialog"`
- `aria-modal="true"`
- titlu asociat
- focus trap
- Escape
- return focus
- navigare completă din tastatură
- statusuri dinamice în `aria-live`

Toate butoanele trebuie să aibă:

- label accesibil;
- focus vizibil;
- disabled state;
- minimum 44–48px touch target.

## 15. Teste backend

Testează:

- Save și Unsave;
- requesturi duplicate/concurente;
- Post inexistent;
- Post arhivat;
- lista privată per utilizator;
- pagination;
- ordering după SavedPost.CreatedAt;
- cascade delete;
- Articles legacy excluse;
- trimiterea către conversație existentă;
- crearea conversației dacă nu există;
- utilizator inexistent;
- post indisponibil;
- shared preview fără date private.

## 16. Teste frontend

Testează:

- exact trei taburi;
- fiecare tab ocupă o treime;
- keyboard navigation pentru trei taburi;
- Share deschide întotdeauna dialogul;
- lista inițială de utilizatori;
- search debounce;
- răspunsuri stale ignorate;
- Send individual loading;
- Sent state;
- protecție double send;
- dialogul rămâne deschis după Send;
- Web Share API;
- fallback când Web Share API lipsește;
- Copy Link și feedback;
- Save/Unsave și rollback;
- Saved page loading/empty/error/success;
- Unsave elimină cardul;
- linkul Saved apare numai pentru owner.

## 17. Criterii de acceptare

Implementarea este completă când:

- Social Profile are exact trei coloane egale.
- Share deschide o fereastră, nu direct selectorul nativ.
- Utilizatorul poate căuta și selecta persoane NovaFit.
- Postarea poate fi trimisă uneia sau mai multor persoane.
- După trimitere apare starea Sent.
- Fereastra oferă separat `Share via...` și `Copy link`.
- Shared post apare corect în Chat.
- Post indisponibil are fallback.
- Save/Unsave funcționează în toate suprafețele.
- Saved Posts este privat și accesibil din profilul propriu.
- UI funcționează pe desktop și mobile.
- Toate buildurile și testele relevante trec.

## 18. Documentație

Creează după implementare:

`.claude/plans/implementation-YYYY-MM-DD-social-saved-and-share.md`

Include:

- funcționalitățile implementate;
- componentele create;
- endpointurile și DTO-urile;
- migrarea EF Core;
- modelul shared post;
- deciziile UX;
- regulile de privacy;
- testele rulate;
- limitările și pașii de rollback.
# Implemented UX refinements — 2026-07-22

These decisions supersede conflicting presentation details later in this plan without changing the Saved/Share API contracts:

- Profile keeps its native three-column Posts grid. PostCard actions appear after opening Post Detail.
- `/social/saved` starts as a three-column grid rather than a list of full PostCards.
- `/social/archived` is a dedicated matching grid page with Restore, loading, empty, error, and pagination states.
- The owner overflow menu contains only Saved and Archived on the standard elevated dropdown surface.
- Saved and Archived use the standard contextual mobile top bar for Back and the page title, while retaining the floating bottom dock; their local headers are desktop-only.
- Share is icon-only and sits directly beside Save in Post Detail.
- The Share dialog is a compact floating mobile sheet above the dock.
- Mobile navigation is a 60px floating pill with 12px viewport insets and a centered 44px circular active state.

---
