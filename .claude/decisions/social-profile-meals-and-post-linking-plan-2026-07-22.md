# NovaFit — Tab Meals în Social Profile, asociere la postări și Hide/Unhide

**Data:** 2026-07-22  
**Status:** Plan complet pentru implementare  
**Arie:** Social Profile / Nutrition / New Post / Privacy  
**Dependență:** extinde implementarea `Add activity` descrisă în `add-activity-saved-workouts-plan-2026-07-22.md`

## 1. Scop

Implementarea introduce trei capabilități conectate:

1. un tab nou `Meals` în profilul social, alături de Posts, Workouts și Stats;
2. asocierea unei mese proprii unei postări din `New Post → Add activity`;
3. control individual `Hide/Unhide` pentru fiecare masă din profil.

Mesele rămân în primul rând date de nutriție. Funcția socială nu trebuie să modifice istoricul alimentar, totalurile calorice sau macronutrienții utilizatorului.

## 2. Decizii de produs și confidențialitate

### 2.1 Vizibilitatea este opt-in

Mesele conțin informații potențial sensibile despre alimentație. Din acest motiv:

- mesele existente vor fi migrate cu `IsHiddenFromProfile = true`;
- mesele noi vor fi create implicit cu `IsHiddenFromProfile = true`;
- numai utilizatorul poate face o masă vizibilă în profil;
- ceilalți utilizatori văd exclusiv mesele pentru care `IsHiddenFromProfile = false`.

Această alegere evită publicarea automată a istoricului nutrițional existent.

### 2.2 Ce înseamnă Hide/Unhide

`Hide/Unhide` controlează numai prezența mesei în tabul `Meals` al profilului social.

Acțiunea NU:

- șterge masa din Account/Nutrition;
- elimină masa din jurnalul zilei;
- modifică totalurile de calorii sau macronutrienți;
- modifică FoodItems;
- arhivează sau șterge postări;
- elimină asocierea dintr-o postare deja publicată.

Dacă o masă a fost asociată unei postări, preview-ul din postare rămâne vizibil chiar dacă masa este ulterior ascunsă din profil. UI-ul de hide trebuie să explice această limită: `This hides the meal from your profile. Existing posts are unchanged.`

### 2.3 Date publice permise

Tabul public Meals și preview-ul din postări pot afișa:

- numele mesei;
- categoria: Breakfast, Lunch, Dinner, Snack, Pre-workout, Post-workout, Other;
- data înregistrării;
- opțional numărul total de alimente, fără denumirile sau cantitățile lor.

Nu se expun public:

- calorii;
- proteine, carbohidrați sau grăsimi;
- gramaj total;
- gramajele alimentelor;
- lista FoodItems;
- notes, până când există o revizuire separată de confidențialitate și moderare.

Owner-ul va vedea în tab aceeași reprezentare publică, pentru a evita confuzia despre ce pot vedea ceilalți. Datele complete rămân în Account/Nutrition.

## 3. Model de date

Entitatea `MealEntry` primește:

```csharp
public bool IsHiddenFromProfile { get; set; } = true;
```

Este necesară o migrare EF Core care:

- adaugă coloana non-nullable;
- folosește `defaultValue: true` pentru toate rândurile existente;
- actualizează `AppDbContextModelSnapshot`;
- adaugă indexul compus recomandat:

```text
(UserId, IsHiddenFromProfile, CreatedAt)
```

Indexul servește atât lista publică, cât și lista privată Hidden, ordonate descrescător după creare.

Nu se creează o entitate socială duplicată pentru mese. `MealEntry` rămâne sursa unică de adevăr.

## 4. Contracte backend noi

### 4.1 ProfileMealSummary

Se adaugă un DTO social separat, fără câmpuri sensibile:

```csharp
public class ProfileMealSummary
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsHiddenFromProfile { get; set; }
    public bool IsOwnMeal { get; set; }
}
```

Nu se reutilizează `MealEntryDto`, deoarece acesta conține calorii, macro-uri și FoodItems.

### 4.2 MealVisibilityResponse

```csharp
public class MealVisibilityResponse
{
    public bool IsHiddenFromProfile { get; set; }
}
```

### 4.3 Endpoint-uri social profile

```http
GET   /api/social/profile/{userId}/meals?page=1&pageSize=12
GET   /api/social/profile/{userId}/meals/hidden?page=1&pageSize=12
PATCH /api/social/profile/meals/{id}/visibility
```

Reguli:

- endpoint-ul public returnează numai `IsHiddenFromProfile = false`;
- endpoint-ul `/hidden` este permis numai când `{userId}` este utilizatorul autentificat;
- PATCH verifică ownership-ul și comută valoarea;
- ID inexistent → `404`;
- masă deținută de alt utilizator → `403`;
- pagina este normalizată la minimum 1;
- `pageSize` este limitat la maximum 50;
- sortare stabilă: `CreatedAt DESC, Id DESC`.

### 4.4 Interfața ISocialService

Se adaugă:

```csharp
Task<PaginatedResponse<ProfileMealSummary>> GetProfileMealsAsync(
    string userId, string requestingUserId, int page, int pageSize);

Task<PaginatedResponse<ProfileMealSummary>> GetHiddenProfileMealsAsync(
    string userId, int page, int pageSize);

Task<MealVisibilityResponse> ToggleMealVisibilityAsync(
    int id, string userId);
```

## 5. Compatibilitate cu Nutrition

`SaveMealRequest` nu trebuie să accepte `IsHiddenFromProfile`. Vizibilitatea socială nu trebuie să poată fi modificată accidental prin formularul normal de editare a mesei.

`MealEntryDto` poate primi `IsHiddenFromProfile` numai dacă Account/Nutrition are nevoie să indice statusul social. În prima versiune nu este necesar; controlul rămâne în Social Profile.

Operațiile Nutrition existente păstrează comportamentul:

- Create: creează masa ascunsă implicit;
- Update: nu modifică vizibilitatea;
- Delete: șterge masa și relația Post devine null prin `DeleteBehavior.SetNull`;
- macro progress: include mesele indiferent de vizibilitatea socială;
- reset/delete daily meals: continuă să afecteze macro-urile exact ca înainte.

## 6. Tabul Meals din Social Profile

### 6.1 Structura taburilor

Tipul frontend devine:

```ts
type ProfileTab = 'posts' | 'workouts' | 'meals' | 'stats';
```

Ordinea recomandată:

```text
Posts → Workouts → Meals → Stats
```

Desktop:

- patru taburi în același sistem vizual existent;
- dimensiuni și active indicator identice.

Mobil:

- tab rail orizontal compact și scrollabil;
- fiecare tab își păstrează iconița și labelul complet;
- scrollbar invizibil;
- tabul activ este adus în viewport;
- nu se comprimă patru labeluri în coloane prea înguste.

### 6.2 Cardul unei mese

Cardul va urma densitatea și limbajul vizual al cardurilor Workouts:

- icon circular `restaurant` sau `lunch_dining`;
- numele mesei ca informație principală;
- tipul și data ca metadata;
- badge `Hidden` vizibil numai owner-ului în lista Hidden;
- meniu `…` sau acțiune icon-only pentru Hide/Unhide;
- fără calorii/macronutrienți în profilul social;
- bordere și suprafețe discrete, fără un nou limbaj vizual.

### 6.3 Stările tabului

Tabul trebuie să aibă stări separate:

- loading skeleton;
- empty public: `No meals shared yet`;
- empty owner-visible: `No meals visible on your profile`;
- error cu `Try again`;
- paginare/load more;
- mutation pending per meal;
- mutation error inline sau status accesibil.

### 6.4 Owner vs alt utilizator

Pentru alt utilizator:

- se afișează numai mesele vizibile;
- nu există acțiuni Hide/Unhide;
- nu se poate accesa lista Hidden.

Pentru owner:

- tabul conține un control compact `Visible | Hidden`;
- `Visible` afișează mesele publice;
- `Hidden` afișează mesele private și acțiunea Unhide;
- Hide mută optimist masa din Visible în Hidden;
- Unhide mută optimist masa din Hidden în Visible;
- dacă request-ul eșuează, mutarea este anulată și apare feedback inline.

## 7. State frontend în SocialProfileFacade

Se adaugă modele frontend:

```ts
export interface ProfileMeal {
  id: number;
  name: string;
  type: MealType;
  date: string;
  createdAt: string;
  isHiddenFromProfile: boolean;
  isOwnMeal: boolean;
}

export interface MealVisibilityResponse {
  isHiddenFromProfile: boolean;
}
```

Facade-ul primește resurse independente:

```ts
profileMeals
hiddenProfileMeals
isLoadingProfileMeals
isLoadingHiddenProfileMeals
profileMealsError
hiddenProfileMealsError
profileMealsHasMore
hiddenProfileMealsHasMore
```

Metode:

```ts
loadProfileMeals(userId: string, reset?: boolean): Promise<void>;
loadMoreProfileMeals(userId: string): Promise<void>;
loadHiddenProfileMeals(userId: string, reset?: boolean): Promise<void>;
loadMoreHiddenProfileMeals(userId: string): Promise<void>;
toggleMealVisibility(mealId: number): Promise<boolean>;
```

Mutations folosesc cheia:

```text
meal-visibility:{mealId}
```

pentru a preveni apăsările multiple.

## 8. Extinderea Add activity din New Post

### 8.1 Fluxul selectorului

Selectorul existent nu va mai începe direct cu `Choose a workout`. El va avea două niveluri de progressive disclosure:

1. alegerea tipului de activitate;
2. alegerea elementului concret.

Nivelul 1:

```text
Workout
Meal
```

Ambele sunt rânduri compacte, cu icon, titlu și explicație scurtă. Ultimul tip folosit poate fi reținut doar pe durata composer-ului, nu global.

Nivelul 2 pentru Meal:

- titlu `Choose a meal`;
- căutare după nume;
- filtre opționale All / Breakfast / Lunch / Dinner / Snack / Other;
- lista meselor proprii, sortată după `Date DESC, CreatedAt DESC`;
- metadata: tip și dată;
- fără macro-uri, calorii sau FoodItems;
- loading, empty, search-empty, error și retry;
- back către alegerea tipului.

### 8.2 Ce mese sunt eligibile

Selectorul poate folosi toate mesele proprii existente, inclusiv cele ascunse din profil, deoarece:

- vizibilitatea în profil și asocierea într-o postare sunt două alegeri diferite;
- utilizatorul publică explicit postarea;
- backend-ul verifică ownership-ul.

Pentru mesele ascunse, selectorul va afișa un indicator discret `Hidden on profile` și explicația că publicarea postării face preview-ul mesei vizibil în postare, fără a o face vizibilă în tabul Meals.

### 8.3 State în CreatePostComponent

Implementarea actuală bazată doar pe `selectedWorkout` se generalizează într-un union type:

```ts
type SelectedActivity =
  | { type: 'workout'; item: WorkoutTemplate }
  | { type: 'meal'; item: MealEntry };
```

Se recomandă:

```ts
selectedActivity: Signal<SelectedActivity | null>;
activityType: Signal<'workout' | 'meal' | null>;
pendingActivity: Signal<SelectedActivity | null>;
```

`canPost` devine:

```ts
hasCaption || hasImage || selectedActivity !== null
```

Request-ul setează exclusiv:

```ts
linkedWorkoutId = selectedActivity.type === 'workout'
  ? selectedActivity.item.id
  : undefined;

linkedMealId = selectedActivity.type === 'meal'
  ? selectedActivity.item.id
  : undefined;
```

Contractul backend păstrează regula existentă: maximum un linked content item per post.

### 8.4 Preview în composer

Workout:

```text
WORKOUT
Core Pilates
45 min · Other
```

Meal:

```text
MEAL
Chicken & Rice Bowl
Lunch · Jul 22
```

Preview-urile folosesc aceeași componentă structurală și diferă doar prin iconiță și metadata. Nu se introduc culori distincte pentru fiecare categorie; violetul rămâne accentul unic al aplicației.

## 9. Backend pentru asocierea mesei

`CreatePostRequest.LinkedMealId` și `Post.LinkedMealId` există deja și trebuie reutilizate.

Validarea din `CreatePostAsync` trebuie adusă la același nivel cu workout-ul:

- masă inexistentă → `404`;
- masă a altui utilizator → `403`;
- masă proprie → acceptată;
- hidden/visible în profil nu afectează eligibilitatea;
- linked meal poate fi singurul conținut al postării;
- nu se poate trimite simultan `linkedMealId` și `linkedWorkoutId`.

`BuildLinkedContentPreview` continuă să returneze numai:

```text
Type = meal
Title = MealEntry.Name
Subtitle = MealEntry.Type
```

Se poate adăuga data în subtitle numai după actualizarea contractului și verificarea consistenței în toate suprafețele social.

Endpoint-ul existent `POST /api/social/posts/from-meal/{mealId}` rămâne pentru fluxul contextual de share. New Post folosește endpoint-ul general `POST /api/social/posts` cu `linkedMealId`.

## 10. Ștergerea unei mese și postările asociate

Relația existentă `Post.LinkedMealId` trebuie să rămână `DeleteBehavior.SetNull`.

La ștergerea mesei din Nutrition:

- masa dispare din profil și selector;
- macro-urile sunt recalculate prin fluxul existent;
- postarea nu este ștearsă;
- `LinkedMealId` devine null;
- preview-ul mesei dispare din postare;
- imaginea și caption-ul rămân.

Dacă postarea conținea numai linked meal, poate rămâne fără conținut vizibil după ștergere. În implementare trebuie luată una dintre următoarele măsuri:

1. recomandat: la publicare se salvează un snapshot social minim (`LinkedContentTitle`, `LinkedContentSubtitle`) care supraviețuiește ștergerii; sau
2. v1 acceptată: prevenirea postării doar cu meal și solicitarea unui caption/imagine.

Recomandarea pentru această implementare este **snapshot social minim**, deoarece aceeași problemă există conceptual și pentru workout-uri. Snapshot-ul nu va conține macro-uri sau alte date sensibile.

Această alegere implică o extindere suplimentară a entității Post și o migrare. Dacă snapshot-ul este amânat, limitarea trebuie documentată explicit înainte de implementare.

## 11. Migrații și indexuri

Migrarea principală:

```text
AddMealProfileVisibility
```

Conține:

- `MealEntries.IsHiddenFromProfile` cu default `true`;
- index `(UserId, IsHiddenFromProfile, CreatedAt)`.

Dacă se aprobă snapshot-ul linked content în aceeași etapă:

- `Posts.LinkedContentTitle` nullable;
- `Posts.LinkedContentSubtitle` nullable;
- populare la crearea postării;
- fără backfill obligatoriu pentru postările existente, care pot continua să folosească relația curentă.

Migrarea trebuie testată pe SQLite atât Up, cât și Down. Down elimină numai coloanele/indexurile noi și nu modifică datele Nutrition existente.

## 12. API security și privacy

Testele de securitate trebuie să demonstreze că:

- utilizatorul A nu poate vedea mesele hidden ale utilizatorului B;
- utilizatorul A nu poate hide/unhide masa utilizatorului B;
- utilizatorul A nu poate asocia masa utilizatorului B unei postări;
- răspunsul public ProfileMealSummary nu conține macro-uri, calorii, gramaje, FoodItems sau notes;
- endpoint-urile cer JWT;
- userId este luat exclusiv din claims pentru mutations;
- page/pageSize sunt normalizate;
- ID-urile inexistente nu produc 500.

## 13. UX și accesibilitate

- tabul Meals folosește `role=tab` și `aria-selected` prin mecanismul existent;
- selectorul Visible/Hidden este accesibil prin tastatură;
- acțiunile Hide/Unhide au touch target de minimum 44px;
- starea hidden nu este comunicată numai prin culoare;
- mutation pending dezactivează numai masa afectată;
- live region anunță `Meal hidden from profile` / `Meal visible on profile`;
- confirmarea Hide explică efectul asupra profilului și faptul că postările rămân neschimbate;
- modalul Add activity păstrează focus trap, Escape, focus return și safe area;
- scrollbarurile tab rail-ului și listelor sunt invizibile, dar scrollul rămâne funcțional;
- motion respectă `prefers-reduced-motion`.

## 14. Fișiere estimate ca fiind afectate

### Backend

- `FitApp.Api/Models/Entities/MealEntry.cs`
- `FitApp.Api/Models/Entities/Post.cs` — numai dacă se implementează snapshot-ul
- `FitApp.Api/Models/DTOs/SocialDtos.cs`
- `FitApp.Api/Data/AppDbContext.cs`
- `FitApp.Api/Services/ISocialService.cs`
- `FitApp.Api/Services/SocialService.cs`
- `FitApp.Api/Controllers/SocialController.cs`
- migrare EF Core + snapshot
- teste API noi pentru meals profile/visibility/linking

### Frontend

- `fit-app/src/app/core/models/social.model.ts`
- `fit-app/src/app/api/social.service.ts`
- `fit-app/src/app/api/nutrition-tab.service.ts`
- `fit-app/src/app/core/facade/social-profile.facade.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.html`
- `fit-app/src/app/features/social/social-profile/social-profile.component.css`
- `fit-app/src/app/features/social/components/create-post/create-post.component.ts`
- `fit-app/src/app/features/social/components/create-post/create-post.component.html`
- `fit-app/src/app/features/social/components/create-post/create-post.component.css`
- teste component/facade/service

## 15. Strategie de testare

### 15.1 Backend

1. lista publică returnează numai mesele visible;
2. owner-ul vede mesele hidden prin endpoint-ul privat;
3. alt utilizator primește 403 pentru lista hidden;
4. hide mută masa din lista publică în hidden;
5. unhide o readuce în lista publică;
6. ownership-ul mutation este verificat;
7. masă inexistentă returnează 404;
8. DTO-ul public nu serializează date sensibile;
9. postare numai cu linked meal este creată corect;
10. linked meal al altui utilizator este respins;
11. multiple linked IDs sunt respinse;
12. delete meal aplică SetNull și păstrează postarea;
13. hide/unhide nu modifică macro progress;
14. migrarea marchează mesele existente hidden.

### 15.2 Frontend Social Profile

1. tabul Meals este prezent și navigabil;
2. alt profil afișează numai visible meals;
3. owner-ul poate alterna Visible/Hidden;
4. Hide/Unhide mută optimist elementul;
5. rollback la eroare;
6. loading, empty, error și load-more sunt distincte;
7. acțiunile nu apar pe profilul altui utilizator;
8. patru taburi sunt utilizabile pe viewport mobil fără comprimare;
9. datele sensibile nu sunt randate.

### 15.3 Frontend New Post

1. Add activity afișează Workout și Meal;
2. navigarea înainte/înapoi între tip și listă funcționează;
3. lista Meal se încarcă lazy;
4. căutarea și filtrele funcționează;
5. selectarea unei mese elimină o selecție workout anterioară și invers;
6. request-ul trimite exclusiv `linkedMealId` sau `linkedWorkoutId`;
7. postarea doar cu meal activează Publish;
8. preview-ul Meal afișează numai nume, tip și dată;
9. hidden meal are indicator și explicație de vizibilitate;
10. selecția persistă după image processing sau submit error;
11. focus trap și focus return funcționează.

### 15.4 E2E

1. utilizatorul înregistrează o masă în Nutrition;
2. masa nu este publică implicit;
3. în profilul propriu, Meals → Hidden conține masa;
4. utilizatorul apasă Unhide;
5. masa apare în Visible și pe profilul văzut de alt cont;
6. utilizatorul creează o postare și asociază masa;
7. postarea afișează preview-ul Meal;
8. utilizatorul ascunde masa din profil;
9. masa dispare din profilul public, dar postarea rămâne neschimbată;
10. utilizatorul șterge masa din Nutrition;
11. macro-urile sunt actualizate, iar comportamentul postării respectă decizia snapshot/v1.

## 16. Ordinea recomandată de implementare

### Etapa 1 — Model și migrare

- `IsHiddenFromProfile`;
- index compus;
- opțional snapshot social minim;
- teste migrare și SetNull.

### Etapa 2 — Backend Social Profile Meals

- DTO-uri publice safe;
- listă visible;
- listă hidden owner-only;
- toggle visibility;
- ownership și privacy tests.

### Etapa 3 — Frontend Profile Meals

- modele și API service;
- state în facade;
- tab Meals;
- Visible/Hidden pentru owner;
- carduri și stări complete;
- tab rail responsive.

### Etapa 4 — Add activity pentru Meal

- generalizarea picker-ului;
- selector Workout/Meal;
- încărcare și filtrare meals;
- preview și request linkedMealId;
- validări 403/404 în backend.

### Etapa 5 — Integrare și regresii

- post detail/feed/profile grid;
- hide/unhide vs linked posts;
- delete meal vs macro totals;
- mobile viewport, safe area și accesibilitate;
- documentarea implementării în `.claude/plans`.

## 17. Criterii de acceptare

Implementarea este completă când:

- profilul are tabul Meals;
- mesele sunt private implicit;
- alt utilizator vede numai mesele făcute vizibile;
- owner-ul poate vedea separat Visible și Hidden;
- fiecare masă poate fi ascunsă/reafișată fără a fi ștearsă;
- hide/unhide nu schimbă jurnalul sau macro-urile;
- New Post permite alegerea între Workout și Meal;
- o singură activitate poate fi asociată;
- backend-ul validează ownership-ul pentru linkedMealId;
- datele publice nu conțin calorii, macro-uri, gramaje sau FoodItems;
- toate stările UI și regulile de accesibilitate funcționează;
- migrarea și testele frontend/backend trec;
- implementarea finală este documentată în `.claude/plans`.

## 18. Riscuri și mitigări

### Publicarea accidentală a datelor nutriționale

Mitigare: hidden implicit, DTO public separat și projection query care nu materializează macro-urile/FoodItems.

### Confuzie între Hide și Delete

Mitigare: texte explicite, iconițe diferite și lipsa acțiunii Delete din tabul social.

### Confuzie între profil și postare

Mitigare: confirmarea Hide precizează că postările existente nu se schimbă; picker-ul marchează mesele hidden.

### Patru taburi prea înguste pe mobil

Mitigare: tab rail orizontal, nu patru coloane fixe.

### Postare goală după ștergerea linked meal

Mitigare recomandată: snapshot social minim; alternativ, caption/imagine obligatorie pentru postările cu meal până la introducerea snapshot-ului.

### Duplicarea logicii Nutrition în SocialService

Mitigare: SocialService folosește proiecții read-only și DTO-uri social-safe; mutația de vizibilitate este limitată la un singur flag. Pe termen lung, acest seam trebuie mutat într-un `ISocialProfileContentService`, conform auditului arhitectural existent.
