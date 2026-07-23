# NovaFit — Add Activity în New Post (workout-uri salvate)

**Data:** 2026-07-22  
**Status:** Plan aprobat pentru implementare  
**Arie:** Social / New Post / Workouts  
**Scop:** Utilizatorul poate atașa unei postări unul dintre workout-urile personale salvate în cont.

## 1. Context și decizie de produs

NovaFit suportă deja asocierea unei postări cu un workout prin `Post.LinkedWorkoutId`, iar `CreatePostRequest` acceptă `linkedWorkoutId`. Totuși, pagina dedicată `/social/new-post` trimite în prezent doar caption-ul și imaginea, fără un control prin care utilizatorul să aleagă un workout.

Implementarea va adăuga opțiunea **Add activity** în pagina New Post. În această etapă, activitatea disponibilă va fi un **workout personal salvat**, reprezentat de un `WorkoutTemplate` care aparține utilizatorului autentificat.

Această asociere nu demonstrează că workout-ul a fost executat. Din acest motiv:

- preview-ul și postarea vor folosi eticheta `WORKOUT`, nu `COMPLETED WORKOUT`;
- fluxul existent `Share to beSocial`, disponibil după terminarea unei sesiuni, rămâne separat;
- nu vor fi afișate calorii, greutăți, seturi executate sau alte date sensibile;
- o postare poate avea maximum o activitate asociată.

## 2. Obiective

1. Adăugarea unui workout salvat direct din pagina New Post.
2. Folosirea contractului existent `linkedWorkoutId`, fără duplicarea logicii social/workout.
3. Păstrarea designului compact, dark și clean al aplicației.
4. Acoperirea completă a stărilor loading, empty, error și success.
5. Validarea ownership-ului în backend, indiferent de datele trimise de frontend.
6. Păstrarea unei arhitecturi extensibile pentru activități viitoare, precum Meal.

## 3. În afara scopului acestei etape

- atașarea unei sesiuni istorice finalizate din selector;
- afișarea statisticilor reale ale unei sesiuni;
- selectarea meselor sau a daily check-in-urilor;
- asocierea mai multor activități aceleiași postări;
- modificarea unei activități asociate după publicarea postării;
- modificări ale schemei bazei de date.

## 4. Fluxul utilizatorului

1. Utilizatorul deschide `/social/new-post`.
2. Sub secțiunea Caption vede acțiunea `Add activity`.
3. Apasă acțiunea și deschide selectorul de activitate.
4. În versiunea inițială selectează categoria `Workout`.
5. Aplicația încarcă lazy workout-urile personale salvate.
6. Utilizatorul caută sau selectează un workout.
7. Confirmă selecția prin `Add`.
8. În New Post apare un preview compact al workout-ului.
9. Utilizatorul poate schimba sau elimina workout-ul înainte de publicare.
10. La publicare, frontend-ul trimite `linkedWorkoutId` împreună cu imaginea și/sau caption-ul.
11. Backend-ul verifică existența și ownership-ul workout-ului.
12. Postarea rezultată afișează preview-ul linked content existent.

## 5. Design și structură UI

### 5.1 Add activity în New Post

Secțiunea va fi poziționată sub Caption și înaintea erorii generale/acțiunilor de publicare.

Starea fără activitate:

- acțiune `Add activity`;
- iconiță discretă de workout;
- control cu înălțime tactilă de minimum 44px;
- fără card greu sau background decorativ;
- border/suprafață subtilă, conform controalelor existente;
- stare hover, active, focus-visible și disabled.

### 5.2 Selectorul

- pe mobil: bottom sheet care respectă safe area și nu intră sub bara de navigație;
- pe desktop: dialog compact, centrat;
- header cu titlu și buton de închidere;
- câmp de căutare după titlul workout-ului;
- listă scrollabilă;
- selecție unică;
- footer cu `Cancel` și `Add`;
- scrollbar ascuns vizual pe mobil, fără dezactivarea scrollului;
- scroll-ul paginii din spate este blocat cât timp selectorul este deschis.

Fiecare workout afișează:

- titlu;
- tip (`Strength`, `HIIT`, `Cardio`, `Other` etc.);
- durată estimată;
- număr de exerciții, când este disponibil;
- indicator vizual și semantic pentru selecție.

### 5.3 Preview după selecție

Preview-ul va folosi aceeași familie vizuală ca linked content din postare:

```text
WORKOUT
Core Pilates
45 min · Other
```

Va include:

- badge discret `WORKOUT` în accentul violet existent;
- titlul workout-ului;
- durata și tipul ca metadata secundară;
- buton pentru eliminare;
- click pe preview pentru schimbarea selecției;
- border sau separator foarte subtil, fără suprafețe grele.

## 6. Date și reguli de selecție

Sursa de date va fi API-ul existent pentru `WorkoutTemplate`, prin `WorkoutsTabService` și `WorkoutsTabFacade` sau printr-un adaptor dedicat dacă reutilizarea facade-ului introduce state nedorit între ecrane.

Lista selectorului va conține doar:

- workout-uri care aparțin utilizatorului autentificat;
- workout-uri salvate/persistate și care au un ID valid;
- workout-uri care nu sunt template-uri globale nesalvate.

Template-urile de sistem cu `isSystemTemplate = true` nu vor putea fi asociate direct. Ele trebuie întâi salvate/clonate în cont, după care copia personală devine eligibilă.

Căutarea:

- rulează local după încărcarea listei;
- este case-insensitive;
- caută cel puțin în `title`;
- nu generează request la fiecare caracter în versiunea inițială.

## 7. Starea frontend

`CreatePostComponent` va primi stări explicite pentru activitate:

```ts
selectedWorkout: Signal<WorkoutTemplate | null>;
isActivityPickerOpen: Signal<boolean>;
isLoadingWorkouts: Signal<boolean>;
workoutsError: Signal<string | null>;
workoutSearch: Signal<string>;
```

Operații necesare:

```ts
openActivityPicker(): Promise<void>;
closeActivityPicker(): void;
selectWorkout(workout: WorkoutTemplate): void;
confirmWorkout(): void;
removeActivity(): void;
retryWorkouts(): Promise<void>;
```

Lista se încarcă lazy la prima deschidere. Redeschiderea selectorului poate reutiliza datele deja încărcate pe durata composer-ului, cu posibilitate de retry după eroare.

Selecția nu trebuie pierdută când utilizatorul:

- adaugă sau schimbă imaginea;
- modifică caption-ul;
- deschide și închide selectorul fără confirmare;
- întâmpină o eroare de publicare recuperabilă.

## 8. Modificarea request-ului de publicare

Request-ul construit de `CreatePostComponent.submit()` va deveni:

```ts
const request: CreatePostRequest = {
  content: this.content().trim()
};

if (this.imagePreview()) {
  request.imageUrl = this.imagePreview()!;
}

if (this.selectedWorkout()) {
  request.linkedWorkoutId = this.selectedWorkout()!.id;
}
```

`canPost` va accepta cel puțin unul dintre următoarele:

- caption valid;
- imagine validă;
- workout selectat.

Formula conceptuală:

```ts
hasCaption || hasImage || hasLinkedActivity
```

Publicarea rămâne blocată dacă:

- caption-ul depășește limita;
- imaginea este încă procesată;
- request-ul este deja în curs;
- selectorul are o stare intermediară neconfirmată.

## 9. Contract și backend

Contractul existent `CreatePostRequest.LinkedWorkoutId` va fi reutilizat. Nu este necesară o migrare deoarece `Post.LinkedWorkoutId` și relația către `WorkoutTemplate` există deja.

Backend-ul trebuie să păstreze următoarele garanții:

1. maximum un linked content per post;
2. workout-ul există;
3. workout-ul aparține utilizatorului autentificat;
4. template-urile globale fără ownership personal nu pot fi atașate;
5. postarea poate fi creată doar cu linked activity, fără caption sau imagine;
6. imaginea și caption-ul sunt procesate prin fluxurile existente;
7. răspunsul conține `LinkedContentPreview` pentru postarea creată.

Erorile trebuie diferențiate:

- `404 Not Found`: workout-ul a fost șters sau nu mai există;
- `403 Forbidden`: workout-ul aparține altui utilizator;
- `400 Bad Request`: request invalid sau mai multe activități atașate;
- `500`: eroare neașteptată, fără expunerea detaliilor interne.

Frontend-ul va transforma aceste cazuri în mesaje clare și va păstra datele composer-ului pentru retry.

## 10. Linked content în postare

După creare, mapping-ul existent pentru `LinkedContentPreview` va afișa:

- `Type = workout`;
- `Title = WorkoutTemplate.Title`;
- `Subtitle = durata + tipul`.

Nu vor fi incluse:

- calorii estimate;
- greutăți;
- BMI, greutate corporală sau alte date de sănătate;
- rezultate care ar sugera că workout-ul a fost executat.

Dacă workout-ul este șters ulterior:

- relația `SetNull` elimină asocierea;
- postarea rămâne în social;
- imaginea și caption-ul rămân intacte;
- preview-ul workout-ului nu mai este afișat.

## 11. Stări obligatorii ale selectorului

### Loading

- skeleton-uri compacte pentru rândurile de workout;
- acțiunea `Add` dezactivată;
- fără salturi mari de layout.

### Empty

- mesaj: utilizatorul nu are workout-uri personale salvate;
- acțiune către Account → Workouts sau pagina relevantă;
- revenirea în New Post trebuie să păstreze draft-ul dacă navigarea aplicației permite acest lucru; dacă nu, această limitare trebuie documentată înainte de implementare.

### Search empty

- mesaj separat pentru lipsa rezultatelor;
- acțiune de ștergere a căutării;
- nu se confundă cu lipsa totală a workout-urilor.

### Error

- mesaj inline;
- buton `Try again`;
- selectorul poate fi închis fără pierderea caption-ului sau imaginii.

### Selected

- rândul selectat are indicator vizibil, icon și `aria-selected=true`;
- culoarea nu este singurul semnal al selecției;
- confirmarea este necesară înainte ca selecția să fie aplicată în composer.

## 12. Accesibilitate și comportament responsive

- toate controalele au target de minimum 44×44px;
- selectorul are titlu accesibil și rol semantic corespunzător;
- rândurile selectabile suportă tastatura;
- `Escape` închide selectorul;
- focusul inițial ajunge în selector după deschidere;
- focusul revine pe `Add activity` sau pe preview după închidere;
- focus-visible folosește accentul aplicației;
- contrastul textului și controalelor respectă minimum WCAG AA;
- selectorul respectă `env(safe-area-inset-bottom)`;
- modalul/bottom sheet-ul nu depășește viewport-ul util și nu intră sub navbar;
- animațiile respectă `prefers-reduced-motion`.

## 13. Fișiere estimate ca fiind afectate

Frontend:

- `fit-app/src/app/features/social/components/create-post/create-post.component.ts`
- `fit-app/src/app/features/social/components/create-post/create-post.component.html`
- `fit-app/src/app/features/social/components/create-post/create-post.component.css`
- componentă nouă pentru activity/workout picker, dacă separarea este justificată;
- `fit-app/src/app/core/facade/workouts-tab.facade.ts`, doar dacă lipsesc stări reutilizabile;
- `fit-app/src/app/api/workouts-tab.service.ts`, doar dacă endpoint-ul actual nu oferă lista necesară;
- teste pentru componentă/facade/service.

Backend, numai pentru întărirea contractului și a erorilor:

- `FitApp.Api/Services/SocialService.cs`
- `FitApp.Api/Controllers/SocialController.cs`
- teste pentru SocialService și/sau controller.

Contractele existente care trebuie verificate, nu neapărat modificate:

- `fit-app/src/app/core/models/social.model.ts`
- `fit-app/src/app/core/models/workouts-tab.model.ts`
- `FitApp.Api/Models/DTOs/SocialDtos.cs`

## 14. Strategie de testare

### 14.1 Teste frontend unit/component

1. `Add activity` deschide selectorul.
2. Lista este cerută doar la prima deschidere sau după retry.
3. Template-urile de sistem nesalvate sunt excluse.
4. Căutarea filtrează după titlu fără diferență între litere mari/mici.
5. Utilizatorul poate selecta un singur workout.
6. `Cancel` nu modifică selecția confirmată anterior.
7. `Add` aplică workout-ul selectat.
8. Preview-ul afișează titlu, durată și tip.
9. Remove elimină `linkedWorkoutId` din viitorul request.
10. `canPost` este true pentru o postare care conține doar workout.
11. Submit trimite ID-ul corect.
12. Selecția rămâne după procesarea imaginii sau după o eroare de submit.
13. Loading, empty, search-empty și error sunt afișate distinct.
14. Submit-ul dublu este prevenit.

### 14.2 Teste backend

1. creează o postare cu workout-ul utilizatorului;
2. creează o postare numai cu workout, fără imagine/caption;
3. respinge ID-ul unui workout care aparține altui utilizator;
4. respinge un workout inexistent;
5. respinge un template global nesalvat;
6. respinge mai multe linked content IDs simultan;
7. include `LinkedContentPreview` în răspuns;
8. nu expune calorii sau alte informații sensibile;
9. după ștergerea workout-ului, postarea rămâne și FK-ul devine null.

### 14.3 Verificare end-to-end

1. Utilizatorul salvează un workout personal.
2. Deschide New Post.
3. Adaugă workout-ul din `Add activity`.
4. Publică doar activitatea, fără caption și imagine.
5. Verifică postarea în feed, profil și post detail.
6. Repetă cu imagine și caption.
7. Verifică schimbarea și eliminarea activității înainte de publicare.
8. Verifică selectorul pe viewport mobil și desktop.
9. Verifică navigarea cu tastatura și focus management-ul.
10. Șterge workout-ul și confirmă că postarea nu este ștearsă.

## 15. Ordinea recomandată de implementare

### Etapa 1 — Contract și verificare date

- confirmarea formei exacte a `CreatePostRequest` frontend/backend;
- confirmarea filtrării workout-urilor personale;
- adăugarea testelor backend pentru ownership și postare doar cu workout;
- standardizarea răspunsurilor 400/403/404.

### Etapa 2 — Activity picker

- componentă responsive;
- încărcare lazy;
- căutare și selecție unică;
- loading, empty, search-empty și error;
- focus management și scroll containment.

### Etapa 3 — Integrarea în New Post

- secțiunea `Add activity`;
- preview-ul selecției;
- schimbare/eliminare;
- actualizarea `canPost` și `submit()`;
- păstrarea draft-ului la erori.

### Etapa 4 — Post rendering și regresii

- verificarea linked preview în feed, profil și post detail;
- verificarea postărilor fără linked content;
- verificarea delete/SetNull;
- testare mobile, desktop și accesibilitate.

### Etapa 5 — Documentare

- actualizarea documentelor de design/social relevante;
- notarea fișierelor modificate și a testelor rulate;
- documentarea diferenței dintre saved workout și completed workout.

## 16. Criterii de acceptare

Implementarea este completă când:

- `Add activity` este disponibil în New Post;
- utilizatorul vede și poate selecta doar workout-urile personale salvate;
- selecția poate fi schimbată și eliminată;
- o postare poate fi publicată numai cu workout-ul asociat;
- `linkedWorkoutId` corect ajunge în backend;
- ownership-ul este validat server-side;
- postarea afișează preview-ul workout-ului în toate suprafețele sociale relevante;
- stările loading, empty, error și retry funcționează;
- selectorul este complet utilizabil pe mobil fără suprapunere cu navbar-ul;
- nu sunt expuse date sensibile și nu se sugerează fals că workout-ul a fost finalizat;
- testele frontend și backend relevante trec.

## 17. Extensibilitate ulterioară

Structura `Add activity` va permite adăugarea ulterioară a altor tipuri fără redesenarea paginii:

- completed workout session;
- meal;
- daily check-in;
- progres sau achievement.

Într-o etapă viitoare, workout-urile finalizate trebuie asociate cu sesiunea reală sau cu un snapshot imutabil al acesteia. Ele nu trebuie amestecate semantic cu workout-urile salvate, care sunt planuri/template-uri și nu dovezi ale execuției.
