# NovaFit — Progress Tab & Raportul Săptămânal „NovaFit Nutritionist"

**Data:** 2026-07-23
**Status:** Plan pregătit pentru implementare
**Arie:** Account / Progress / Nutriție / AI / Backend + Frontend
**Contribuții:** analiză arhitectură + date (tech-architect), cercetare de piață, spec UI/UX mobile-first (uiux-designer), mapare completă a codului existent (explorare backend + frontend)
**Rută:** `/account/progress` — componenta `ProgressTabComponent`, în prezent un placeholder „Coming soon" fără nicio logică. Rebuild complet.

---

## 1. Context și obiectiv de produs

Pagina Progress este singurul tab din Account care nu oferă încă nimic — este un card static cu patru bullet-uri promise („Weight trends", „Body measurements", „Progress photos", „Progress reports"). În același timp, aplicația colectează deja zilnic date bogate (mese, macro-uri, apă, pași, activitate, calorii) prin Dashboard, dar nu există nicio suprafață care să transforme aceste date brute în informație utilă pe termen mediu (7/30 de zile). Asta lasă pe masă exact tipul de valoare care ține utilizatorii în aplicație: să vadă rezultatul efortului lor.

Cerința centrală a acestui plan, explicit cerută: o **analiză săptămânală de tip „nutriționist NovaFit"**, disponibilă *doar* atunci când utilizatorul a înregistrat complet — mese, activitate, pași și apă — în fiecare din ultimele 7 zile consecutive. Dacă pierde o zi, contorul se resetează la 0. Dacă utilizatorul continuă să înregistreze complet zi de zi, raportul rămâne deblocat și se recalculează în permanență pe ultimele 7 zile complete (fereastră glisantă). Acesta este în mod deliberat un mecanism de retenție: motivul concret pentru care utilizatorul are interes să își completeze mesele, apa și pașii în fiecare zi.

Pe lângă acest feature central, planul acoperă restul paginii Progress: tendința de greutate, tendințele de calorii/macro-uri/apă/pași pe 7 sau 30 de zile, și cardurile de sumar de sus — astfel încât tab-ul să devină complet funcțional, nu doar un singur widget.

---

## 2. Cercetare de piață (ce validează abordarea)

Cercetare rapidă asupra aplicațiilor de referință (MyFitnessPal, Whoop, Noom, Fitbit, Cronometer) confirmă trei decizii din acest plan:

1. **Streak-urile cresc retenția.** Recompensele de progres consistente (streak-uri, vizualizări de progres, mici victorii) pot dubla ratele de adherență în aplicațiile bazate pe obiceiuri — exact mecanismul pe care raportul săptămânal îl exploatează, dar legat de *calitatea* completării zilnice (toate cele 4 categorii), nu doar de simpla prezență în aplicație.
2. **Media mobilă pe 7-14 zile e standardul pentru greutate, nu valoarea brută.** O aplicație bună de tracking arată media glisantă pe 7-14 zile, care filtrează zgomotul zilnic și arată traiectoria reală — pe aceasta ar trebui bazate deciziile, nu pe o singură cântărire. Graficul de greutate din acest plan afișează explicit punctele brute **și** o linie de medie glisantă pe 7 zile, nu doar punctele brute.
3. **Integrarea greutate + nutriție în aceeași aplicație e ceea ce diferențiază.** Corelarea a ceea ce mănânci cu felul în care reacționează greutatea ta e posibilă doar dacă ambele sunt înregistrate în același loc — ceea ce NovaFit are deja (meniuri, `DailyEntry`), doar că nu e niciodată pus cap la cap. Comparația „estimat vs. măsurat" din raportul săptămânal (§6.3) este exact acest tip de corelare.

Toate cele trei practici confirmă direcția din acest plan; nu e nevoie de o pagină Progress cu funcționalități suplimentare exotice — un tab solid, cu grafice clare și un raport săptămânal cu valoare reală, e suficient pentru acest ciclu.

---

## 3. Starea actuală a codului (verificată direct, nu presupusă)

### 3.1 Backend — ce există deja și poate fi reutilizat direct

- **`DailyEntry`** (`FitApp.Api/Models/Entities/DailyEntry.cs`): `UserId+Date` (index unic), `ActivityType`, `WaterConsumedL`, `Steps`, `StepTarget`, `MacrosProtein/Carbs/Fats` (%), `CaloriesBurned`, `CaloriesIntake` (calculat mereu server-side din `MealEntries`), `CaloriesTotal`. **Conține deja `ManualWeight (double?)` și `EnergyLevel (int?)`, adăugate în migrația `20260529174400_AddDailyEntryWeightAndEnergy`, dar complet neexpuse** — nu apar în niciun DTO, niciun request, nicio componentă frontend. Coloanele există deja în baza de date. **Nu e nevoie de nicio migrație nouă pentru a le folosi** — doar wiring de DTO + UI.
- **`MetricsService.CalculateAndApply`**: calculează și persistă pe `User` — `Bmi`, `Bmr` (Mifflin-St Jeor), `Tdee` (Bmr × multiplicator activitate), `GoalCalories` (`Tdee ± 500` după `Goal`), `WaterL` (`greutate × 0.033`). Acestea sunt exact input-urile necesare pentru estimarea surplus/deficit.
- **`DailyDataService.ComputeStreakCoreAsync`**: sursa de adevăr pentru streak-ul general existent (orice rând `DailyEntry` există pentru ziua respectivă = zi „logată"). **Streak-ul cerut în acest plan este diferit și mai strict** — necesită toate cele 4 categorii, nu doar existența rândului — deci va fi un algoritm nou, separat, nu o modificare a celui existent (vezi §6.2 pentru motivul explicit).
- **`MealEntry`**: are deja `Date` (string ISO, același format ca `DailyEntry.Date` → comparabile direct prin `==`), `TotalCalories`, `TotalProtein_g`, `TotalCarbs_g`, `TotalFats_g`. Suficient pentru analiza de macro-uri săptămânală.
- **`stats-tab.component.ts`** (`fit-app/src/app/features/social/social-profile/stats-tab/`): pattern de grafic **SOLID**, gata de reutilizat 1:1 — `ng2-charts` peste Chart.js, stilizare prin `cssToken()` (citește variabilele CSS live), tooltip pe teme dark, `prefersReducedMotion()`.
- **`GetAiInsightAsync` din `DashboardService`**: pattern deja existent de cache per-utilizator-per-zi via `IMemoryCache` — exact modelul de cache de refolosit pentru naratiunea AI a raportului săptămânal.
- **`AiProxyService.AskTextAsync`**: infrastructura Groq (`llama-3.1-8b-instant`) e deja acolo, cu un pattern de „module context" injectat server-side — de refolosit pentru naratiunea nutriționistului.

### 3.2 Ce lipsește (goluri confirmate, nu presupuse)

1. Niciun endpoint de istoric „ușor" (doar metrici, pentru grafice) — există doar `GET /api/daily/history`, paginare completă pe rânduri întregi (`pageSize` capat la 50). Pentru grafice pe 30 de zile ar însemna over-fetching inutil.
2. Niciun câmp de „greutate țintă"/obiectiv pe `User` sau altă entitate — tab-ul Goals e complet gol, deci graficul de greutate din Progress **nu** va suprapune o linie de target în această etapă (vezi §5, în afara scopului).
3. `ProgressTabComponent` și `GoalsTabComponent` sunt ambele stub-uri „Coming soon" fără logică — nimic de păstrat la Progress.
4. Volumul/streak-ul din `UserService.GetPublicStatsAsync` (folosit pentru profilul social) e calculat din `WorkoutTemplates`, nu din `WorkoutSessions` — inconsistență semnalată, dar nu afectează acest plan (Progress nu se bazează pe volum de antrenament).

---

## 4. Obiective

1. Un tab Progress complet funcțional, mobile-first, aliniat 100% cu design system-ul existent (tokens, `MetricCard`, `ProgressRing`, pattern-ul de grafice din `stats-tab`).
2. Feature-ul central: **raportul săptămânal „NovaFit Nutritionist"**, deblocat strict la 7 zile consecutive complete (mese + activitate + pași + apă), cu reset la orice zi incompletă, recalculat continuu pe fereastra glisantă de 7 zile.
3. Wiring complet al câmpurilor deja existente dar moarte în baza de date (`ManualWeight`, `EnergyLevel`) — fără nicio migrație nouă.
4. Grafice de tendință (greutate, calorii in/out, macro-uri, hidratare, pași) pe fereastră selectabilă 7/30 zile.
5. O suită de carduri de sumar (`MetricCard`) sus, care oferă o citire de-o secundă a stării curente.
6. Zero regresii asupra Dashboard, Nutrition, Workouts sau streak-ului general existent — feature-ul e aditiv.

---

## 5. În afara scopului acestei etape (Fază 2, documentată la §16)

- Măsurători corporale (talie, șolduri etc.) — necesită entitate nouă, nu există azi.
- Poze de progres — necesită storage de fișiere + UI de comparare, effort separat.
- Tab-ul Goals (greutate țintă, dată țintă) — rămâne stub; Progress nu suprapune o linie de target pe graficul de greutate în această etapă.
- Rescrierea streak-ului general existent (`ComputeStreakCoreAsync`) — rămâne neschimbat; noul streak de „zi completă" e un concept separat și explicit diferit.
- Notificare push dedicată pentru streak-ul de zi completă (posibilă extensie a `StreakReminderWorker`, menționată ca hook la §16, nu inclusă acum).

---

## 6. Feature-ul central: Raportul Săptămânal „NovaFit Nutritionist"

### 6.1 Definirea „zilei complete"

O zi `DailyEntry` e „completă" doar dacă **toate** cele 4 condiții sunt adevărate pentru acea dată:

| Categorie | Condiție |
|---|---|
| Mese | Există cel puțin un `MealEntry` cu `IsSavedMeal == false` pentru acea dată |
| Activitate | `DailyEntry.ActivityType` nu e null/gol (include selecția explicită „Rest Day" — o zi de odihnă aleasă conștient contează ca înregistrare onestă, nu ca lipsă) |
| Pași | `DailyEntry.Steps > 0` |
| Apă | `DailyEntry.WaterConsumedL > 0` |

**Limitare cunoscută, acceptată pentru MVP:** un utilizator care chiar a făcut 0 pași sau a băut 0L într-o zi ar apărea ca „nelogat" (fals negativ). Pragul `> 0` e ales pentru simplitate — nu există azi un flag separat „a fost introdus explicit". Dacă devine o problemă reală, Faza 2 poate adăuga flag-uri explicite de „atins" per câmp.

### 6.2 Algoritmul streak-ului de zi completă

Nou, separat de `ComputeStreakCoreAsync` (streak-ul general existent, care doar verifică dacă rândul `DailyEntry` există). Motivul separării: streak-ul general e folosit în mai multe locuri ale aplicației (badge de nav, widget Dashboard, `StreakReminderWorker`) cu semantica lui proprie deja stabilită; a-l redefini ar rupe acele suprafețe. Noul streak trăiește exclusiv în contextul Progress.

Logică (oglindește deliberat pattern-ul de „grace period" din streak-ul general, pentru consistență de UX cu ceva ce utilizatorii deja cunosc):

1. Se încarcă ultimele ~60 de zile `DailyEntry` + existența `MealEntry` per dată pentru utilizator.
2. Se calculează predicatul „zi completă" (§6.1) pentru fiecare dată din interval.
3. `CompleteDayStreak` = numărul de zile complete consecutive, numărând înapoi de la azi (sau de la ieri, dacă azi încă nu s-a încheiat și nu e încă completă — ziua curentă nu rupe streak-ul cât timp mai e timp să fie completată).
4. Dacă se găsește o zi din trecut incompletă înainte de a ajunge la 60 de zile, numărătoarea se oprește acolo.
5. `MissingToday` = lista categoriilor încă necompletate azi (`["steps", "water"]` etc.) — folosită direct în UI pentru mesaj acționabil („Loghează pașii și apa ca să continui").
6. `DaysUntilUnlock = max(0, 7 - CompleteDayStreak)`.
7. Raportul e disponibil (`WeeklyReport != null`) doar când `CompleteDayStreak >= 7`.

### 6.3 Conținutul raportului și formulele

Fereastra raportului = cele mai recente 7 zile complete consecutive (nu neapărat ultimele 7 zile calendaristice, dacă streak-ul tocmai a trecut de 7 — dar în regim normal, odată deblocat, cele două coincid pentru că orice zi incompletă ar fi resetat streak-ul).

**Surplus/deficit → estimare kg/g:**

```
netZilnic(zi) = CaloriesIntake(zi) - User.Tdee
netTotal7zile = Σ netZilnic pentru cele 7 zile
estimareSchimbareGreutateKg = netTotal7zile / 7700
```

**Decizie explicită:** se folosește `User.Tdee` (deja calculat, include multiplicatorul de activitate ales de utilizator la onboarding) ca linie de bază, nu `Tdee + CaloriesBurned din antrenamente`. Motiv: `Tdee` reflectă deja stilul de viață general al utilizatorului; a aduna separat caloriile de antrenament ar risca dublă numărare parțială. Constanta `7700 kcal ≈ 1 kg` e o aproximare uzuală în industrie, nu o valoare medicală exactă — textul din UI trebuie să spună „estimare", nu „calcul exact". Această simplificare e documentată explicit ca decizie asumată (nu omisiune) — o rafinare (bază sedentară + calorii de exercițiu adăugate explicit, stil MyFitnessPal) rămâne o opțiune de Fază 2 dacă feedback-ul utilizatorilor o cere.

**Comparație „estimat vs. măsurat" (bonus, condiționat):**

Dacă utilizatorul a logat `ManualWeight` de cel puțin 2 ori în fereastra de 7 zile:
```
schimbareMasurataKg = ultimaGreutateLogata - primaGreutateLogata (în fereastră)
```
Afișată alături de estimarea calculată, cu un badge „Aproape identic" (diferență < 20% din valoarea estimată) sau „Diferă" (cu tooltip explicativ: retenție de apă etc.). Această comparație nu apare deloc dacă există sub 2 cântăriri în fereastră.

**Hidratare:**
```
apaMedie = media(WaterConsumedL) pe 7 zile
aderentaApa% = apaMedie / User.WaterL × 100
```
Narrare: `<70%` = sub țintă, `70-110%` = pe țintă, `>110%` = peste țintă (fără ton alarmist).

**Pași:**
```
pasiMedii = media(Steps) pe 7 zile, comparat cu StepTarget
```
Narrare pe trend (crescător/descrescător pe cele 7 zile) + comparație cu ținta personală.

**Mese/macro-uri:**
```
mealsLogged = numărul total de MealEntry (non-saved) din fereastră
avgMacroPct{Protein,Carbs,Fat} = media procentului de calorii per macro, calculat din gramele reale × (4 sau 9 kcal/g) / calorii totale reale
targetMacroPct = 30% proteină / 45% carbohidrați / 25% grăsimi din GoalCalories (aceeași formulă deja folosită de `DashboardService` pentru targeturile de macro afișate azi pe Dashboard — consistență totală cu ce vede deja utilizatorul)
```

### 6.4 Naratiune AI

Un paragraf (3-5 propoziții) generat prin Groq (`llama-3.1-8b-instant`, același model ca AI Chat), cu un system prompt dedicat de „nutriționist NovaFit" cald și direct. Modelul primește **doar statisticile agregate calculate mai sus** (nu date brute meal-by-meal, nu istoricul complet) — respectă același principiu de minimizare a datelor expuse către AI ca `AiProxyService.BuildModuleContextAsync`. Exemplu de output țintă: *"Săptămâna asta ai avut un deficit moderat de 486 kcal/zi — exact în zona bună pentru slăbit sănătos. Hidratarea a fost excelentă la 114% din țintă, dar pașii au fost cu 24% sub obiectiv; o plimbare scurtă după cină ar închide diferența asta. Continuă așa."*

### 6.5 Caching și regenerare

- Cache per-utilizator-per-fereastră, cheie `weekly-report-narrative:{userId}:{windowEnd}`, expirare absolută la miezul nopții local — oglindește exact pattern-ul `GetAiInsightAsync`.
- Regenerare necesară doar când (a) fereastra se mută (ziua se schimbă și streak-ul rămâne ≥7) sau (b) streak-ul tocmai a trecut de 7 (moment de deblocare). Nu la fiecare încărcare de pagină.
- Buton manual de refresh în header-ul cardului (vizibil doar când deblocat) → invalidare explicită de cache prin `POST /api/progress/report/refresh`.

---

## 7. Date noi introduse de utilizator

- **Greutatea zilnică** (`ManualWeight`, kg) — input rapid inline pe pagina Progress (nu bottom sheet, vezi justificarea din §9.6), două câmpuri simple nu merită o schimbare de context.
- **Nivelul de energie** (`EnergyLevel`, 1-5) — selector de 5 puncte, opțional, alături de greutate în același rând.

Ambele se salvează prin endpoint-ul `PUT /api/daily` existent, extins (§8.2) — nu un endpoint nou dedicat, pentru a rămâne consistent cu fluxul de auto-save deja existent pentru celelalte câmpuri zilnice (debounce 1500ms, `DashboardFacade.performAutoSave()`).

---

## 8. Arhitectură backend

### 8.1 Fapt cheie: nicio migrație nouă necesară

`ManualWeight` și `EnergyLevel` există deja în schema bazei de date (migrația `20260529174400_AddDailyEntryWeightAndEnergy`, deja aplicată). Streak-ul de zi completă și raportul săptămânal sunt calculate on-demand din date existente (`DailyEntry`, `MealEntry`, `User`) — nu necesită tabele noi. Acest lucru reduce semnificativ riscul de implementare: nu e nevoie de `db-migration-specialist` pentru schimbări de schemă în această etapă, doar pentru a confirma că indexul existent `(UserId, Date)` pe `DailyEntry` (și, de verificat, un index similar pe `MealEntry(UserId, Date)`) acoperă eficient interogările pe fereastră de 30 de zile.

### 8.2 DTO-uri noi și extinse

**Extindere `DailyDtos.cs`** (câmpuri noi, opționale, backward-compatible):

```csharp
// DailyEntryDto, DailyEntrySummaryDto — adăugare:
public double? ManualWeight { get; set; }
public int? EnergyLevel { get; set; }

// SaveDailyEntryRequest — adăugare:
[Range(30, 300)] public double? ManualWeight { get; set; }
[Range(1, 5)] public int? EnergyLevel { get; set; }
```

`DailyDataService.SaveForDateAsync` / `GetForDateAsync` / `GetAllAsync` primesc mapping-ul suplimentar pentru cele două câmpuri (2-3 linii fiecare, pattern identic cu restul câmpurilor deja mapate).

**DTO-uri noi** (`ProgressDtos.cs`):

```csharp
public class ProgressSummaryDto
{
    public ProgressTrendsDto Trends { get; set; } = new();
    public CompleteStreakStatusDto Streak { get; set; } = new();
    public NutritionistWeeklyReportDto? WeeklyReport { get; set; }
}

public class ProgressTrendsDto
{
    public int Window { get; set; }                    // 7 sau 30
    public List<string> Dates { get; set; } = [];       // yyyy-MM-dd, crescător
    public List<double?> WeightKg { get; set; } = [];
    public List<int?> EnergyLevel { get; set; } = [];
    public List<int> CaloriesIn { get; set; } = [];
    public List<int> CaloriesBurned { get; set; } = [];
    public double Tdee { get; set; }                    // linie de referință constantă
    public List<double> ProteinG { get; set; } = [];
    public List<double> CarbsG { get; set; } = [];
    public List<double> FatG { get; set; } = [];
    public List<double> WaterL { get; set; } = [];
    public double WaterTargetL { get; set; }
    public List<int> Steps { get; set; } = [];
    public List<int> StepTarget { get; set; } = [];
}

public class CompleteStreakStatusDto
{
    public int CompleteDayStreak { get; set; }
    public bool LoggedTodayComplete { get; set; }
    public List<string> MissingToday { get; set; } = []; // "meals" | "activity" | "steps" | "water"
    public int DaysUntilUnlock { get; set; }
}

public class NutritionistWeeklyReportDto
{
    public string WindowStart { get; set; } = "";
    public string WindowEnd { get; set; } = "";
    public double AvgCaloriesIn { get; set; }
    public double Tdee { get; set; }
    public double NetCaloriesTotal { get; set; }
    public double EstimatedWeightChangeKg { get; set; }
    public double? ActualWeightChangeKg { get; set; }
    public double AvgWaterL { get; set; }
    public double WaterTargetL { get; set; }
    public double WaterAdherencePct { get; set; }
    public double AvgSteps { get; set; }
    public int StepTarget { get; set; }
    public int MealsLogged { get; set; }
    public double AvgProteinPct { get; set; }
    public double AvgCarbsPct { get; set; }
    public double AvgFatPct { get; set; }
    public double TargetProteinPct { get; set; } = 30;
    public double TargetCarbsPct { get; set; } = 45;
    public double TargetFatPct { get; set; } = 25;
    public string AiNarrative { get; set; } = "";
    public DateTime GeneratedAt { get; set; }
}
```

### 8.3 Endpointuri noi

```
GET  /api/progress/summary?window=7|30     Bearer   → ProgressSummaryDto
POST /api/progress/report/refresh          Bearer   → NutritionistWeeklyReportDto (regenerează naratiunea AI, 429/400 dacă streak < 7)
```

`window` e clampat server-side la `{7, 30}` (implicit 7 dacă parametrul lipsește sau e invalid) — aceeași filosofie ca `pageSize = Math.Min(pageSize, 50)` deja folosită în restul aplicației.

**`ProgressController`** (`[Route("api/[controller]")]`, `[Authorize]`), urmează exact pattern-ul `DashboardController`.

### 8.4 Servicii noi

**`IProgressService` / `ProgressService`** (scoped, înregistrat în `Program.cs` alături de celelalte), dependințe: `AppDbContext`, `AiProxyService`, `IMemoryCache`.

Metode:
- `Task<ProgressTrendsDto> GetTrendsAsync(userId, window)`
- `Task<CompleteStreakStatusDto> GetCompleteStreakStatusAsync(userId)` — implementează algoritmul din §6.2
- `Task<NutritionistWeeklyReportDto?> GetWeeklyReportAsync(userId, forceRefresh=false)` — orchestrează calculul statisticilor (§6.3) + apelul cache-uit către naratiunea AI
- `Task<ProgressSummaryDto> GetSummaryAsync(userId, window)` — agregă cele trei de mai sus într-un singur răspuns, exact ca `DashboardService.GetTodayAsync`

**Extensie `AiProxyService`:**
- `Task<string> GenerateWeeklyNutritionistNarrativeAsync(userId, NutritionistWeeklyReportDto statsOnly)` — construiește system prompt-ul de nutriționist, trimite doar câmpurile numerice agregate din DTO (fără narrativul AI însuși, evident), primește textul înapoi.

---

## 9. Arhitectură frontend

### 9.1 Structura paginii (mobile-first, 375px, ordine de sus în jos)

```
Page Header Strip                                   48px   "Progress" + subtitlu
— 16px —
SUMMARY STAT CARDS (grid MetricCard)                ~264px
  Avg Calories | Weight Δ | Avg Water | Avg Steps
  Complete-Day Streak (card 5, full-width pe mobil)
— 24px —
COMPLETE-DAY STREAK HERO CARD                       ~216px
  Ring X/7 + checklist "Mese / Activitate / Pași / Apă"
— 16px —
NOVAFIT NUTRITIONIST WEEKLY REPORT CARD             ~180-420px
  Locked: overlay blur + progress "X din 7 zile"
  Unlocked: 4 tile-uri analiză + rând estimat-vs-măsurat + naratiune AI
— 32px —
WINDOW SELECTOR (7 zile / 30 zile — pill toggle)    40px
— 16px —
WEIGHT TREND CARD (quick-log inline + grafic)       ~296px
— 16px —
CALORIES IN VS OUT CARD                             ~248px
— 16px —
MACROS TREND CARD                                   ~248px
— 16px —
HYDRATION TREND CARD                                ~248px
— 16px —
STEPS TREND CARD                                    ~248px
— 64px clearance —
```

Spațiere pe grila de 8px (`spatial.md`): 16px între carduri din aceeași secțiune, 24px între secțiuni majore, 32px între zona de raport și zona de grafice (separare conceptuală intenționată).

### 9.2 CompleteStreakHeroComponent (nou)

`features/user/progress-tab/complete-streak-hero/complete-streak-hero.component.*`

- `ProgressRing` variantă `md` (136px), cu 3 tokens noi de adăugat în `styles.css`:
  ```css
  --ring-streak:     var(--color-streak);       /* #ff9f40 — în progres */
  --ring-streak-hot: var(--celebration-gold);   /* #fbbf24 — 7/7 */
  --ring-streak-bg:  rgba(255, 159, 64, 0.12);
  ```
- Checklist de 4 iteme (Mese/Activitate/Pași/Apă), cu iconițe `check_circle` (verde, `--color-success`) vs `radio_button_unchecked` (gri, `--text-disabled`).
- Badge de status: „X/7 DAYS" (în progres) → „UNLOCKED" (deblocat), cu `aria-live="polite"` pe valoarea centrală a ring-ului, ca actualizările de streak să fie anunțate de screen reader.
- Stări: Zero / Building (azi incomplet) / Building (azi complet) / Unlocked / Loading / Error — fiecare cu heading și subtitlu dinamic (detaliat integral în raportul UI/UX original; textele exacte rămân la latitudinea `@angular-developer` + `@uiux-designer` la implementare, structura și token-urile sunt fixate aici).
- La deblocare (streak trece 6→7): bordura cardului trece la `rgba(251,191,36,0.30)` + glow ambiental `0 0 32px rgba(251,191,36,0.12)`.

### 9.3 NutritionistReportCardComponent (nou)

`features/user/progress-tab/nutritionist-report-card/nutritionist-report-card.component.*`

**Locked:** două straturi — un preview complet al structurii raportului (blur `10px` + `brightness(0.45)`, `aria-hidden="true"`, tile-uri în stare skeleton) sub un overlay de lacăt (`lock_outline`, bară de progres „X din 7 zile" cu `--ring-streak`, text explicativ, link „Ce contează?" cu popover care listează cele 4 categorii).

**Unlocked:** grid 2×2 (1 coloană sub 430px) de tile-uri de analiză:

| Tile | Iconiță | Culoare | Conținut |
|---|---|---|---|
| Calorii | `local_fire_department` | `--primary` | Deficit/surplus net (`--color-success`/`--color-warning`) + „≈ X kg estimat" |
| Hidratare | `water_drop` | `--color-hydration` | Medie L/zi + % din țintă |
| Pași | `directions_walk` | `--color-success` | Medie/zi + % vs țintă + iconiță trend |
| Macro-uri | `restaurant` | `--primary-light` | „P 42% · C 38% · F 20%" + o propoziție de status |

Sub tile-uri, condiționat (doar dacă ≥2 cântăriri în fereastră): rândul „Estimat vs. Măsurat", cu badge „Aproape identic" / „Diferă".

La final, blocul de naratiune AI — header cu iconiță `auto_awesome` aurie + label „Nova · Analiză săptămânală", text `aria-live="polite"`, buton de refresh (icon `refresh`, spin la loading).

Stări complete: Locked / Loading (streak≥7, se încarcă) / Unlocked+naratiune-loading / Unlocked+eroare-date / Unlocked+eroare-doar-naratiune / Fully unlocked.

### 9.4 Cardurile de sumar (top) — `MetricCard` × 5

Refolosesc integral pattern-ul deja documentat în `components.md` §2.1 (nu un component nou): Avg Calories, Weight (cu badge Δ), Avg Water, Avg Steps, Complete-Day Streak (full-width pe mobil, tranziționează la auriu când streak ≥ 7).

### 9.5 Graficele de tendință — un singur component reutilizabil (decizie de arhitectură)

Specificația UI/UX originală descrie 5 carduri de grafic aproape identice ca structură (header, container 200px, legendă sub grafic, stări identice). **Decizie explicită de simplificare**: în loc de 5 componente aproape duplicate, se construiește **un singur `ProgressTrendChartComponent` reutilizabil**, parametrizat prin `@Input() kind: 'calories' | 'macros' | 'hydration' | 'steps'`, care selectează intern configurația Chart.js (tip, dataset-uri, culori, linie de țintă) pe baza lui `kind`. Graficul de greutate rămâne separat (`ProgressWeightCardComponent`) pentru că are logică proprie semnificativ diferită (dual-series raw+medie glisantă, quick-log inline) care nu se pretează la același parametru.

Configurație per tip (toate urmează pattern-ul `stats-tab.component.ts`: `ng2-charts`/Chart.js, `cssToken()`, `responsive/maintainAspectRatio:false`, legendă ascunsă din Chart.js + legendă custom sub grafic, tooltip pe temă dark, animație `400ms easeOutQuart` cu gating pe `prefersReducedMotion()`):

- **Calorii In vs Out**: bare grupate — „Consumate" (`--primary` la 65% opacitate) vs „Ars din antrenamente" (`--color-success` la 50%), plus o linie orizontală punctată de referință la `User.Tdee` (aceeași tehnică folosită la liniile de țintă de hidratare/pași — dataset `line` cu valoare constantă).
- **Macro-uri**: bare grupate pe 3 (proteină/carbo/grăsime, culorile `--macro-protein/carbs/fat`), cu targeturile afișate în tooltip (linii de adnotare doar dacă pluginul Chart.js annotation e disponibil, altfel omise cu mențiune în subtitlu).
- **Hidratare**: bare cu `--color-hydration`, linie punctată de țintă (`WaterTargetL`), barele care depășesc ținta primesc opacitate mai mare (semnal vizual de reușită).
- **Pași**: identic structural cu hidratarea, culoare `--color-success`, target pe `StepTarget`, ticks Y formatate cu „k" peste 1000.

### 9.6 Weight quick-log — inline, nu bottom sheet (justificare)

Decizie: intrare inline pe pagină, nu bottom sheet. Motiv: sunt doar două câmpuri (greutate + nivel energie) — nu justifică o schimbare de context modală, mai ales pe o pagină deja densă în date unde utilizatorul vrea să rămână în contextul vizual al graficului de greutate. Stilul de input minimal deja stabilit pentru secțiunea Account (underline transparent, focus violet) face intrarea aproape invizibilă în repaus. Un bottom sheet pentru 2 câmpuri ar tripla costul interacțiunii (tap, animație, dismiss) fără beneficiu. Bottom sheet-ul rămâne rezervat pentru editarea unei intrări istorice (tap pe un punct din grafic) — o interacțiune diferită, unde un overlay e justificat.

Rând inline (`.wqh-row`): input greutate (`type=number`, step 0.1, sufix „kg") + selector energie (5 puncte, `role="radiogroup"`) + buton de salvare (`icon-btn-round`, `check`). După salvare, colapsează într-un rând de confirmare compact cu buton de editare.

Grafic: 2 dataset-uri — puncte brute (`--primary`, fără smoothing, `tension:0`, pentru că zgomotul zilnic e informație reală) și media glisantă pe 7 zile (`--color-streak`, linie punctată, `tension:0.35`, fără puncte). Legendă custom sub grafic (2 chip-uri de culoare), pentru că cele două serii nu sunt distinse suficient doar prin legenda Chart.js implicită.

### 9.7 Responsive (breakpoints confirmate din `spatial.md` §6)

| Secțiune | <375px | 375-429px | 430-767px | 768-967px | ≥968px |
|---|---|---|---|---|---|
| Grid carduri sumar | 1-col | 1-col | 2-col (streak full) | 3-col | 3-col (max 800px centrat) |
| Streak hero | ring deasupra textului | ring deasupra | ring + text pe rând | ring + text pe rând | ring + text pe rând |
| Ring streak | 96px (sm) | 96px | 136px (md) | 136px | 136px |
| Grid tile-uri raport | 1-col | 1-col | 2×2 | 2×2 | 2×2 (max 800px) |
| Weight quick-log | stivuit | stivuit | rând inline | rând inline | rând inline |
| Înălțime container grafic | 180px | 200px | 200px | 220px | 240px |
| Content max-width | 100%-32px | 100%-32px | 100%-32px | 800px centrat | 800px centrat |

Sub 768px, containerul rădăcină al tab-ului nu are border/shadow propriu (regulă deja stabilită pentru Account la mobil) — cardurile individuale își păstrează border-ul.

### 9.8 Secvența de animație la deblocare

Cel mai important moment de motion din pagină — trebuie să simtă ca o recompensă. 7 pași coregrafiați (0-1800ms): tranziția culorii ring-ului spre auriu (`--duration-celebration`, `--ease-spring`) → glow radial → cross-fade badge „X/7"→"UNLOCKED" → bordura cardului hero devine aurie → overlay-ul de lacăt dispare → preview-ul raportului se de-blurează → cele 4 tile-uri „pop" în cascadă (refolosind keyframe-ul `completion-tile-pop`, mutat din `workout-completion-card.component.css` în `styles.css` global, pentru că devine o primitivă de celebrare reutilizabilă — exact cum e deja notat în `components.md` că acel card e „model pentru alte celebrări").

Cu `prefers-reduced-motion`: toate tranzițiile de mai sus devin fade-uri simple de opacitate la 150ms, fără scale/glow/blur — dar `aria-live` anunță tot starea, indiferent de preferința de motion.

### 9.9 Accesibilitate (confirmare, nu excepții noi față de sistemul existent)

- Ring-ul de streak și badge-ul de status: `aria-live="polite"` + `aria-atomic="true"`.
- Checklist: `role="list"`/`listitem"`, fiecare element cu `aria-label` explicit ("Mese: completat" / "Apă: neînregistrat încă").
- Overlay-ul de lacăt: `role="status"`, anunță „Raport deblocat" la tranziție.
- Selector energie: `role="radiogroup"`, fiecare punct `role="radio"` + `aria-checked`.
- Fiecare container de grafic: `role="img"` + `aria-label` + un rezumat text `.sr-only` cu concluzia cheie (pattern deja folosit în `stats-tab`).
- Toate țintele de atingere: minimum 48×48px (regulă globală, fără excepții pe această pagină).
- Contrast: toate textele folosesc token-urile de ierarhie existente (`--text-primary/secondary/tertiary/muted`); pentru text sub 14px se preferă `--text-tertiary` (50%) în locul lui `--text-muted` (35%), aceeași convenție deja aplicată la etichetele de 11px din restul aplicației.

### 9.10 Fișiere frontend noi

```
features/user/progress-tab/
  progress-tab.component.{ts,html,css}                      rebuild complet
  complete-streak-hero/complete-streak-hero.component.*      nou
  nutritionist-report-card/nutritionist-report-card.component.*  nou
  progress-weight-card/progress-weight-card.component.*      nou
  progress-trend-chart/progress-trend-chart.component.*      nou, parametrizat (kind)

core/models/progress.model.ts                                nou — ProgressSummaryDto, ProgressTrendsDto,
                                                               CompleteStreakStatusDto, NutritionistWeeklyReportDto
api/progress.service.ts                                       nou — getSummary(window), refreshReport()
core/facade/progress.facade.ts                                nou — signals: summary/loading/error/window,
                                                                computed: streak/weeklyReport/trends;
                                                                metode: loadSummary(window), setWindow(window), refreshReport()
core/facade/dashboard.facade.ts (sau user.facade.ts)          extindere — logTodayWeight(weight, energyLevel) →
                                                                reutilizează fluxul existent saveDaily()/performAutoSave()
```

---

## 10. Design system — token-uri noi (adăugare aditivă în `styles.css` `:root`)

```css
--ring-streak:     var(--color-streak);
--ring-streak-hot: var(--celebration-gold);
--ring-streak-bg:  rgba(255, 159, 64, 0.12);
```

Toate celelalte elemente vizuale folosesc token-uri deja existente (`--macro-*`, `--color-hydration`, `--color-streak`, `--celebration-gold`, ierarhia de text, radius/shadow/motion) — zero coliziuni, zero nevoie de redesign al sistemului de token-uri.

---

## 11. Fișiere estimate ca fiind afectate

**Backend:**
- `FitApp.Api/Models/DTOs/DailyDtos.cs` — extindere `DailyEntryDto`, `DailyEntrySummaryDto`, `SaveDailyEntryRequest`
- `FitApp.Api/Models/DTOs/ProgressDtos.cs` — nou
- `FitApp.Api/Services/DailyDataService.cs` — mapping `ManualWeight`/`EnergyLevel`
- `FitApp.Api/Services/ProgressService.cs` + `IProgressService.cs` — nou
- `FitApp.Api/Services/AiProxyService.cs` — metodă nouă `GenerateWeeklyNutritionistNarrativeAsync`
- `FitApp.Api/Controllers/ProgressController.cs` — nou
- `FitApp.Api/Program.cs` — înregistrare DI `ProgressService`

**Frontend:** (listate integral la §9.10)

**Design system:** `fit-app/src/styles.css` (3 token-uri noi + mutarea keyframe-ului `completion-tile-pop` din scope local în global)

**De verificat (nu neapărat modificat):** index existent pe `MealEntry(UserId, Date)` — dacă lipsește, de semnalat pentru `db-migration-specialist` (interogarea de „zi completă" face join frecvent pe acest pattern).

---

## 12. Strategie de testare

**Backend (xUnit):**
- `ComputeCompleteDayStreak` — cazuri: 0 zile, streak parțial, streak exact 7, streak >7 continuu, reset după o zi incompletă la mijloc, „Rest Day" contează ca activitate validă, grație pentru ziua curentă neîncheiată.
- Formula de surplus/deficit — verificare aritmetică directă cu valori cunoscute (inclusiv rotunjire kg/g).
- `WeeklyReport == null` strict sub streak 7, populat corect la exact 7.
- Cache-ul naratiunei AI — nu reapelează Groq în aceeași zi/fereastră; invalidare corectă la `POST /api/progress/report/refresh`.
- `window` clampat la {7,30}, fallback la 7 pentru valori invalide.
- Regresie: `ComputeStreakCoreAsync` (streak-ul general existent) neschimbat — testele existente trebuie să treacă neschimbate.

**Frontend (Jasmine/Karma):**
- `ProgressFacade` — încărcare summary, schimbare fereastră, stare de loading/eroare.
- `CompleteStreakHeroComponent` — randare corectă pe toate cele 6 stări din §9.2.
- `NutritionistReportCardComponent` — tranziția locked→unlocked, `aria-hidden` eliminat corect la deblocare.
- `ProgressTrendChartComponent` — configurație corectă de dataset per `kind`, fallback la stare goală fără date.
- Quick-log greutate — validare input, colaps după salvare, integrare cu fluxul de auto-save existent (fără request-uri duplicate).

**End-to-end (Cypress, dat fiind că repo-ul are deja teste Cypress):**
- Parcurs complet: utilizator loghează 7 zile complete consecutive (fixture de date) → raportul se deblochează → verificare vizuală a secvenței de deblocare → o zi incompletă → resetare confirmată.
- Navigare `/account/progress`, refresh, verificare state persistă corect.

---

## 13. Ordinea recomandată de implementare

Urmează workflow-ul standard din `CLAUDE.md` pentru un feature nou cu schemă de date (chiar dacă fără migrație propriu-zisă, tot trece prin verificare de indexare).

### Etapa 1 — Contract și verificare date (`@db-migration-specialist`, `@tech-architect`)
- Confirmare index `MealEntry(UserId, Date)`, eventual migrație de index (fără schimbare de coloane).
- Fixare finală a `ProgressDtos.cs` ca și contract, publicat în `.claude/contracts/`.

### Etapa 2 — Backend core (`@dotnet-developer`)
- Extindere `DailyDtos.cs` + mapping `ManualWeight`/`EnergyLevel` în `DailyDataService`.
- `ProgressService` — algoritm streak zi completă + calcul statistici raport.
- `AiProxyService.GenerateWeeklyNutritionistNarrativeAsync` + cache.
- `ProgressController`, înregistrare DI.

### Etapa 3 — Frontend fundație (`@angular-developer`)
- `progress.model.ts`, `progress.service.ts`, `progress.facade.ts`.
- `logTodayWeight()` pe facade-ul existent, integrat cu auto-save.

### Etapa 4 — Componente UI (`@angular-developer`, spec de la `@uiux-designer`)
- `CompleteStreakHeroComponent`, `NutritionistReportCardComponent` (toate stările din §9.2/§9.3).
- `ProgressWeightCardComponent` (quick-log + grafic dual-series).
- `ProgressTrendChartComponent` parametrizat + integrare în `ProgressTabComponent`.
- Token-uri noi în `styles.css`, mutare `completion-tile-pop` în global.

### Etapa 5 — Secvența de deblocare și motion (`@angular-developer`)
- Animația de 7 pași din §9.8, cu fallback `prefers-reduced-motion`.

### Etapa 6 — Regresii și accesibilitate (`@angular-developer`, `@code-reviewer`)
- Verificare zero impact asupra streak-ului general, Dashboard, auto-save existent.
- Audit `aria-live`, `role`, contrast, touch targets.

### Etapa 7 — Testare (`@test-engineer`)
- Suita completă din §12.

### Etapa 8 — Review (`@code-reviewer`) și audit final (`@security-auditor`, `@performance-engineer`)
- Securitate: naratiunea AI nu expune date brute către Groq dincolo de statisticile agregate; endpoint-urile noi respectă `[Authorize]` + extragere `UserId` din JWT, nu din body.
- Performanță: interogările de streak/trend nu fac N+1 pe 30-60 de zile; cache-ul AI previne apeluri Groq redundante.

---

## 14. Riscuri și mitigări

| Risc | Mitigare |
|---|---|
| Confuzie între cele două concepte de „streak" (general vs. zi completă) în UI | Terminologie explicit diferită în interfață: streak-ul general rămâne „streak" cu flacăra existentă; noul concept se numește constant „zi completă" / „complete-day streak" în cod și copy, niciodată doar „streak" fără calificativ |
| Predicat „zi completă" cu praguri `>0` generează fals negative pentru cazuri reale (0 pași, 0L apă) | Documentat explicit ca limitare acceptată (§6.1); flag-uri explicite de „atins" rămân opțiune de Fază 2 |
| Formula de surplus/deficit dă senzația de precizie falsă | Copy explicit „estimare", nu „calcul exact"; comparația cu greutatea măsurată oferă context real când există date |
| Cost/latență Groq la fiecare vizualizare a raportului | Cache per zi/fereastră (§6.5), regenerare doar la schimbare de fereastră sau la deblocare |
| 5 componente de grafic aproape duplicate cresc suprafața de întreținere | Consolidate într-un singur `ProgressTrendChartComponent` parametrizat (§9.5) |
| Regresie asupra streak-ului general sau a auto-save-ului de pe Dashboard | Noul cod e strict aditiv — niciun fișier al streak-ului general (`ComputeStreakCoreAsync`) sau al fluxului de auto-save existent nu e modificat, doar extins cu câmpuri opționale |

---

## 15. Criterii de acceptare

- `/account/progress` afișează o pagină complet funcțională, fără nicio referință la „Coming soon".
- Streak-ul de zi completă se calculează corect, cu reset la orice zi incompletă și grație pentru ziua curentă neîncheiată.
- Raportul săptămânal e strict inaccesibil sub 7 zile complete consecutive și complet populat la exact 7.
- Estimarea de surplus/deficit, hidratare, pași și macro-uri sunt corecte aritmetic față de formulele din §6.3.
- Naratiunea AI se generează, se cache-uiește corect și nu reapelează Groq inutil.
- Greutatea și nivelul de energie se pot loga inline, fără bottom sheet, integrate cu fluxul de auto-save existent.
- Toate cele 5 grafice de tendință funcționează pe fereastra 7/30 zile, cu stări de loading/empty/error corecte.
- Design-ul respectă 100% token-urile și convențiile spațiale existente — zero valori hardcodate noi.
- Zero regresie asupra streak-ului general, Dashboard-ului sau fluxului de salvare zilnică existent.
- Accesibilitate: toate elementele interactive ating 48px touch target, `aria-live` funcțional pe streak și naratiune, `prefers-reduced-motion` respectat.
- Build și teste (backend + frontend + Cypress) trec.

---

## 16. Extensibilitate ulterioară (Fază 2, neinclusă acum)

- **Măsurători corporale** — entitate nouă (`BodyMeasurement`: talie, șolduri, piept, brațe, dată), grafic de tendință similar celui de greutate.
- **Poze de progres** — reutilizare `IFileStorageService` existent, UI de comparare side-by-side (before/after slider).
- **Integrare cu Goals** — odată ce tab-ul Goals capătă un câmp de greutate țintă, graficul de greutate din Progress suprapune o linie de target; raportul săptămânal poate adăuga „la ritmul actual, atingi ținta în X săptămâni".
- **Rafinarea formulei de surplus/deficit** — bază sedentară + calorii de exercițiu adăugate explicit (stil MyFitnessPal), dacă feedback-ul utilizatorilor arată că estimarea actuală simplificată nu e suficient de precisă.
- **Reminder dedicat pentru streak-ul de zi completă** — extensie a `StreakReminderWorker` existent, cu mesaj specific („mai completează apa azi ca să nu pierzi streak-ul de nutriționist"), separat de reminder-ul general de streak deja existent.
- **Flag-uri explicite „atins" per categorie** — pentru a elimina falsul negativ de la pragurile `>0` pe pași/apă (§6.1).

---

## 17. Decizii explicite

1. **Streak-ul de zi completă e un concept nou, separat de streak-ul general existent** — nu se modifică `ComputeStreakCoreAsync`.
2. **Nicio migrație de bază de date nu e necesară pentru MVP** — `ManualWeight`/`EnergyLevel` există deja, doar DTO-uri și UI lipsesc.
3. **Formula de surplus/deficit folosește `Tdee` static, nu `Tdee + calorii de antrenament`** — simplitate și consistență cu restul aplicației, documentat ca simplificare asumată.
4. **5 grafice de tendință → 1 component parametrizat**, nu 5 componente aproape duplicate.
5. **Weight quick-log e inline, nu bottom sheet** — două câmpuri nu justifică schimbarea de context.
6. **Naratiunea AI primește doar statistici agregate, niciodată date brute meal-by-meal** — consistent cu filosofia de minimizare a datelor deja aplicată în `AiProxyService`.
7. **Raportul se recalculează pe fereastră glisantă de 7 zile, nu pe săptămâni calendaristice fixe** — coerent cu cerința explicită de a recompensa continuitatea, nu un ciclu artificial luni-duminică.
8. **Măsurătorile corporale, pozele de progres și integrarea cu Goals rămân explicit în afara scopului** acestei etape (Fază 2, §16).
