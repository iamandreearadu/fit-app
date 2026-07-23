# NovaFit — Account tabs ca Angular child routes

**Data:** 2026-07-23  
**Status:** Plan pregătit pentru implementare  
**Arie:** Account / Angular routing / UI architecture  
**Decizie:** `UserPageComponent` rămâne shell-ul paginii Account, iar fiecare tab devine componentă copil încărcată printr-un child route.

## 1. Context

Pagina Account folosește în prezent un model mixt:

- `ProfileTabComponent`, `PhysicalTabComponent`, `WorkoutsTabComponent` și `NutritionTabComponent` sunt deja componente standalone;
- taburile sunt afișate prin `activeTab` și `*ngIf`;
- Progress, Goals, Settings și Notifications sunt încă definite direct în `user-page.component.html`;
- URL-ul principal rămâne `/account`, iar tabul poate fi inițializat opțional prin `?tab=...`;
- navigarea între taburi nu creează intrări distincte în istoricul browserului.

Structura actuală funcționează, dar `UserPageComponent` combină responsabilități de shell, navigare și conținut. Pe măsură ce taburile cresc, această structură devine mai greu de întreținut și testat.

## 2. Obiective

1. Fiecare tab Account să aibă un URL stabil și linkuibil.
2. Back/Forward și refresh să păstreze tabul activ.
3. Fiecare tab să poată fi încărcat lazy.
4. `UserPageComponent` să conțină numai shell-ul, navigarea comună și `router-outlet`.
5. Să fie păstrate designul, formularele, modalele și comportamentele mobile actuale.
6. Linkurile vechi de forma `/account?tab=workouts` să continue să funcționeze.
7. Migrarea să poată fi implementată și verificată incremental.

## 3. Structura de rute propusă

URL-urile canonice:

```text
/account/profile
/account/physical
/account/workouts
/account/nutrition
/account/progress
/account/goals
/account/settings
/account/notifications
```

`/account` va redirecționa către:

```text
/account/profile
```

Configurația recomandată:

```ts
{
  path: 'account',
  canActivate: [AuthGuard],
  loadComponent: () =>
    import('./features/user/user-page.component')
      .then(m => m.UserPageComponent),
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'profile' },
    {
      path: 'profile',
      loadComponent: () =>
        import('./features/user/profile-tab/profile-tab.component')
          .then(m => m.ProfileTabComponent),
    },
    {
      path: 'physical',
      loadComponent: () =>
        import('./features/user/physical-tab/physical-tab.component')
          .then(m => m.PhysicalTabComponent),
    },
    {
      path: 'workouts',
      loadComponent: () =>
        import('./features/user/workouts-tab/workouts-tab.component')
          .then(m => m.WorkoutsTabComponent),
    },
    {
      path: 'nutrition',
      loadComponent: () =>
        import('./features/user/nutrition-tab/nutrition-tab.component')
          .then(m => m.NutritionTabComponent),
    },
    {
      path: 'progress',
      loadComponent: () =>
        import('./features/user/progress-tab/progress-tab.component')
          .then(m => m.ProgressTabComponent),
    },
    {
      path: 'goals',
      loadComponent: () =>
        import('./features/user/goals-tab/goals-tab.component')
          .then(m => m.GoalsTabComponent),
    },
    {
      path: 'settings',
      loadComponent: () =>
        import('./features/user/settings-tab/settings-tab.component')
          .then(m => m.SettingsTabComponent),
    },
    {
      path: 'notifications',
      loadComponent: () =>
        import('./features/user/notifications-tab/notifications-tab.component')
          .then(m => m.NotificationsTabComponent),
    },
  ],
}
```

Pentru a păstra `app.routes.ts` compact, configurația poate fi extrasă în:

```text
fit-app/src/app/features/user/account.routes.ts
```

iar ruta principală va folosi `loadChildren`.

## 4. Responsabilitatea Account shell

După migrare, `UserPageComponent` va gestiona numai:

- layout-ul Account;
- sidebar-ul desktop;
- rail-ul de taburi mobile;
- datele sumare comune, precum avatar, nume, email și streak;
- starea sidebar-ului collapsed;
- compatibilitatea temporară cu `?tab=...`;
- zona `<router-outlet>`.

Din `UserPageComponent` se elimină:

- `activeTab`;
- `VALID_TABS`, după încheierea perioadei de compatibilitate;
- `setActiveTab()`;
- importurile eager pentru toate componentele de tab;
- blocurile `*ngIf` care aleg conținutul;
- markup-ul taburilor Coming Soon.

Conținutul principal devine:

```html
<main class="up-content">
  <router-outlet />
</main>
```

## 5. Navigarea taburilor

Butoanele din sidebar și rail-ul mobil vor deveni linkuri Angular:

```html
<a
  routerLink="/account/workouts"
  routerLinkActive="active"
  aria-label="Workouts"
>
  ...
</a>
```

Reguli:

- `routerLinkActive` controlează starea vizuală;
- `aria-current="page"` este aplicat tabului activ;
- focus-visible rămâne conform design system-ului;
- touch target-ul rămâne minimum 44px;
- navigarea nu produce reload complet;
- scroll-ul paginii ajunge la început după schimbarea tabului, conform regulii globale existente;
- rail-ul mobil aduce tabul activ în viewport când este necesar.

## 6. Compatibilitate cu linkurile existente

În cod pot exista linkuri precum:

```text
/account?tab=workouts
/account?tab=nutrition
```

Acestea nu trebuie rupte. În perioada de tranziție:

1. shell-ul citește parametrul `tab`;
2. dacă valoarea este validă, navighează către `/account/{tab}`;
3. navigarea folosește `replaceUrl: true`;
4. query param-ul vechi este eliminat din URL;
5. parametrii fără legătură cu tabul sunt păstrați numai dacă au un consumator valid.

Exemplu conceptual:

```ts
const legacyTab = route.snapshot.queryParamMap.get('tab');

if (isAccountTab(legacyTab)) {
  router.navigate(['/account', legacyTab], {
    replaceUrl: true,
  });
}
```

În paralel, toate linkurile interne trebuie căutate și migrate la URL-urile canonice. Compatibilitatea legacy va rămâne cel puțin o versiune stabilă și poate fi eliminată ulterior doar după un audit `rg`.

## 7. Componente noi

Următoarele secțiuni inline vor fi extrase în componente standalone:

```text
progress-tab/
  progress-tab.component.ts
  progress-tab.component.html
  progress-tab.component.css

goals-tab/
  goals-tab.component.ts
  goals-tab.component.html
  goals-tab.component.css

settings-tab/
  settings-tab.component.ts
  settings-tab.component.html
  settings-tab.component.css

notifications-tab/
  notifications-tab.component.ts
  notifications-tab.component.html
  notifications-tab.component.css
```

În prima etapă, aceste componente păstrează exact conținutul și designul Coming Soon existent. Nu se introduc funcționalități noi în cadrul refactorizării.

## 8. Păstrarea comportamentului formularelor și modalelor

Migrarea nu modifică logica din Workouts și Nutrition:

- formularele New/Edit Workout și New/Edit Meal rămân în componentele lor;
- footerul modalului rămâne fix și vizibil;
- numai conținutul formularului este scrollabil;
- bara de navigare mobilă este ascunsă cât timp editorul este deschis;
- filtrele și dropdownurile își păstrează poziționarea responsive;
- la navigarea către alt tab, componenta curentă este distrusă, la fel ca în modelul actual cu `*ngIf`;
- un modal deschis nu trebuie să supraviețuiască navigării către alt tab.

Selectorii CSS actuali de forma:

```css
app-user-page app-workouts-tab ...
app-user-page app-nutrition-tab ...
```

rămân valizi deoarece componentele copil continuă să fie randate sub `app-user-page`.

Trebuie verificat explicit comportamentul selectorilor cu `:has(.overlay)` folosiți pentru ascunderea bottom navigation.

## 9. State management și ciclul de viață

Comportamentul implicit recomandat este distrugerea componentei când utilizatorul schimbă tabul. Acesta corespunde comportamentului actual bazat pe `*ngIf`.

Consecințe:

- căutările locale și filtrele nesalvate se resetează la revenirea în tab;
- formularele neconfirmate se închid;
- datele persistate se reîncarcă prin facade conform politicii existente;
- state-ul global din facade/store rămâne disponibil dacă este deja cache-uit.

Nu se introduce un custom `RouteReuseStrategy` în această etapă. Acesta ar păstra formulare și modale în stări greu de anticipat și ar crește riscul de stale data.

Dacă ulterior produsul cere păstrarea filtrelor, acestea vor fi sincronizate explicit în query params, nu prin păstrarea ascunsă a componentei.

## 10. Lazy loading

Pentru ca child routes să aducă un beneficiu real:

- `UserPageComponent` nu mai importă direct taburile;
- fiecare rută folosește `loadComponent`;
- componentele taburilor nu sunt incluse inutil în chunk-ul inițial Account;
- facade-urile shared rămân `providedIn: root` numai dacă acest lifecycle este intenționat;
- componentele grele din Nutrition și Workouts rămân încărcate doar când ruta este vizitată.

După implementare se compară output-ul build-ului pentru a confirma separarea chunk-urilor.

## 11. Tipuri și metadata centralizată

Se recomandă un tip comun:

```ts
export type AccountTab =
  | 'profile'
  | 'physical'
  | 'workouts'
  | 'nutrition'
  | 'progress'
  | 'goals'
  | 'settings'
  | 'notifications';
```

Și o configurație unică pentru sidebar și rail-ul mobil:

```ts
export interface AccountTabDefinition {
  id: AccountTab;
  label: string;
  desktopLabel: string;
  icon: string;
  route: string;
}
```

Aceasta elimină duplicarea actuală dintre navigarea desktop și cea mobilă. Ambele suprafețe vor itera aceeași listă.

Configurația nu trebuie să conțină componente sau callbacks; routing-ul rămâne responsabilitatea Angular Router.

## 12. Titluri și top bar

Top bar-ul global afișează în prezent `Account`. În prima etapă titlul rămâne neschimbat pentru toate child routes, pentru consistență.

Opțional, într-o etapă ulterioară, route `data` poate include:

```ts
data: { title: 'Workouts' }
```

Nu se recomandă schimbarea titlului top bar în aceeași etapă, deoarece aceasta ar combina refactorizarea arhitecturală cu o modificare de UX.

## 13. Fișiere estimate ca fiind afectate

Principale:

- `fit-app/src/app/app.routes.ts`
- `fit-app/src/app/features/user/account.routes.ts` — nou
- `fit-app/src/app/features/user/user-page.component.ts`
- `fit-app/src/app/features/user/user-page.component.html`
- `fit-app/src/app/features/user/user-page.component.css`
- `fit-app/src/app/features/user/account-tab.model.ts` — opțional, recomandat
- cele patru componente Coming Soon noi;
- teste pentru routing și shell.

De verificat:

- toate fișierele care navighează către `/account?tab=...`;
- `app-top-bar`;
- `app-bottom-nav`;
- redirect-uri după onboarding;
- linkuri din empty states;
- linkuri din Dashboard, Social și meniul utilizatorului;
- teste Cypress care selectează taburile prin click sau query param.

## 14. Ordinea recomandată de implementare

### Etapa 1 — Inventar și teste de caracterizare

- inventarierea tuturor linkurilor `/account` și `?tab=`;
- teste pentru ruta implicită și fiecare tab;
- teste pentru refresh pe un child route;
- test pentru linkurile legacy;
- capturi/criterii vizuale pentru desktop și mobil.

### Etapa 2 — Componentele lipsă

- extragerea Progress;
- extragerea Goals;
- extragerea Settings;
- extragerea Notifications;
- păstrarea markup-ului și CSS-ului existent;
- verificarea accesibilității heading-urilor și landmark-urilor.

### Etapa 3 — Configurația child routes

- introducerea `account.routes.ts`;
- definirea redirectului implicit;
- configurarea lazy loading;
- adăugarea `router-outlet` în shell;
- eliminarea importurilor eager.

### Etapa 4 — Navigarea shell-ului

- înlocuirea butoanelor cu `routerLink`;
- folosirea unei singure configurații pentru desktop și mobil;
- `routerLinkActive` și `aria-current`;
- păstrarea auto-scroll-ului rail-ului mobil;
- verificarea stărilor active perfect identice cu designul actual.

### Etapa 5 — Compatibilitate și migrarea linkurilor

- redirect intern pentru `?tab=...`;
- migrarea tuturor linkurilor aplicației la child routes;
- actualizarea testelor și deep linkurilor;
- păstrarea fallback-ului legacy temporar.

### Etapa 6 — Regresii Workouts/Nutrition

- filtre și dropdownuri desktop/mobile;
- New/Edit Workout;
- New/Edit Meal;
- bottom navigation ascunsă în modal;
- footer și buton permanent vizibile;
- selecturile deschise peste modal;
- scroll și safe-area;
- creare, editare și ștergere.

### Etapa 7 — Cleanup și documentare

- eliminarea `activeTab`, `setActiveTab()` și `*ngIf`;
- eliminarea CSS-ului mort;
- actualizarea documentelor `.claude`;
- scrierea raportului de implementare în `.claude/plans`;
- rularea build-ului și a testelor relevante.

## 15. Strategie de testare

### 15.1 Routing

1. `/account` redirecționează la `/account/profile`.
2. Fiecare child route încarcă tabul corect.
3. Refresh păstrează tabul.
4. Back/Forward schimbă tabul corect.
5. O rută Account necunoscută redirecționează controlat la profile.
6. `AuthGuard` protejează întregul arbore Account.
7. `/account?tab=workouts` ajunge la `/account/workouts`.
8. Un `tab` legacy invalid ajunge la profile fără eroare.

### 15.2 Shell

1. Sidebar-ul și rail-ul mobil marchează aceeași rută activă.
2. Click pe tab actual nu produce efecte nedorite.
3. Avatarul, streak-ul și datele contului se încarcă o singură dată la nivel de shell.
4. Layout-ul nu se deplasează între taburi.
5. Navigarea cu tastatura și focus-visible funcționează.

### 15.3 Lifecycle

1. Componenta veche este distrusă la schimbarea tabului.
2. Subscription-urile sunt închise corect.
3. Un modal deschis dispare la navigare.
4. Revenirea în tab reîncarcă datele fără request-uri duplicate necontrolate.
5. Nu există memory leaks după schimbări repetate de tab.

### 15.4 Regresii responsive

1. Toate taburile sunt accesibile pe mobil.
2. Tabul activ este vizibil în rail.
3. Bottom navigation nu acoperă conținutul.
4. Modalele Workouts/Nutrition ascund bottom navigation.
5. Footerul modalelor rămâne vizibil.
6. Dropdownurile filtrelor rămân în viewport.
7. Desktop sidebar collapsed funcționează.

### 15.5 Build și performanță

- `npm run build`;
- testele unitare existente;
- testele componentelor Account;
- teste E2E pentru navigare și formulare;
- inspecția chunk-urilor lazy;
- verificarea absenței erorilor în consolă.

## 16. Riscuri și mitigări

### Linkuri vechi rupte

Mitigare: adaptor temporar pentru `?tab=...`, inventar complet și `replaceUrl`.

### Pierderea stării tabului

Mitigare: comportamentul actual deja distruge componentele prin `*ngIf`; filtre persistente viitoare vor folosi query params.

### Stiluri care nu se mai aplică

Mitigare: componentele rămân descendente ale `app-user-page`; se rulează audit pentru selectorii scoped și `:has`.

### Request-uri duplicate

Mitigare: auditarea `ngOnInit`, facade caching și teste de lifecycle.

### Shell prea cuplat la taburi

Mitigare: metadata comună conține numai label/icon/route, fără referințe la implementarea componentelor.

### Refactorizare prea mare într-un singur pas

Mitigare: componentele Coming Soon se extrag înainte, apoi se activează routing-ul într-un commit separat și verificabil.

## 17. Criterii de acceptare

Implementarea este completă când:

- fiecare tab Account este componentă standalone;
- fiecare tab are child route propriu;
- `/account` redirecționează la profile;
- refresh și Back/Forward funcționează;
- linkurile legacy cu `?tab=` continuă să funcționeze;
- shell-ul nu mai conține conținutul taburilor;
- shell-ul nu mai gestionează manual `activeTab`;
- taburile sunt lazy-loaded;
- starea activă este corectă pe desktop și mobil;
- Workouts și Nutrition păstrează toate fixurile recente;
- formularele și dropdownurile nu sunt acoperite de bottom navigation;
- build-ul și testele relevante trec;
- implementarea este documentată în `.claude/plans`.

## 18. Decizii explicite

1. **Se folosesc child routes**, nu doar componente copil randate prin `*ngIf`.
2. **`UserPageComponent` rămâne shell**, nu se creează un shell duplicat.
3. **Nu se introduce RouteReuseStrategy** în această etapă.
4. **Nu se schimbă designul taburilor** în timpul refactorizării.
5. **Nu se adaugă funcționalități** în taburile Coming Soon.
6. **Compatibilitatea `?tab=` este temporar obligatorie**.
7. **Workouts și Nutrition sunt tratate ca zone cu risc ridicat de regresie** și primesc verificare E2E dedicată.
