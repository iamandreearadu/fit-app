# Business audit — Social Profile / NovaFit

**Data:** 2026-07-22  
**Scope:** întreaga pagină `Social/Profile`, cu accent pe rolul, diferențierea și eficiența `Posts` versus `Articles`.  
**Perspective:** business logic, valoare pentru utilizator, retenție, network effects, UX, design și măsurare.  
**Tip document:** analiză și recomandare de produs; nu include modificări de cod.

## Verdict executiv

Social Profile are în prezent prea multe roluri puse la același nivel: identitate socială, portofoliu vizual, bibliotecă de workouts, publishing editorial și dashboard de performanță. Toate sunt utile separat, dar împreună pagina nu răspunde suficient de repede la întrebarea principală a vizitatorului: **„Cine este acest atlet și de ce merită să îl urmăresc?”**

Recomandarea este:

1. **Păstrează Posts.** Este formatul cu cea mai mică fricțiune, cea mai mare frecvență potențială și cea mai bună legătură cu feed-ul, likes, comments, follow și share.
2. **Nu elimina imediat Articles, dar repoziționează-l.** Articles trebuie să devină `Guides` sau `Knowledge`: conținut evergreen, structurat, salvabil și util, care construiește autoritate. Dacă rămâne doar „un post de până la 8.000 de caractere”, nu justifică un tab, un model de date și un flow separat.
3. **Evită dublarea în profil.** Articolul trebuie distribuit în feed printr-un card de promovare, dar în profil trebuie să existe o singură reprezentare canonică. Counterele și analytics trebuie să distingă clar Posts de Guides.
4. **Schimbă default-ul profilului din galerie într-un rezumat de identitate și valoare.** Recomandat: `Activity`, `Workouts`, `Guides`, `Stats`, cu secțiuni Featured/Pinned deasupra conținutului.

Decizia finală pentru Articles trebuie luată după un experiment de 6–8 săptămâni bazat pe creare, consum, saves și follow conversion. Fără aceste date, eliminarea sau extinderea lui ar fi o decizie intuitivă.

## 1. Rolul business al Social Profile

Profilul nu este doar o pagină personală. Într-un produs fitness social, el trebuie să îndeplinească patru funcții comerciale:

1. **Conversie în Follow:** vizitatorul înțelege rapid dacă persoana este relevantă pentru obiectivele sale.
2. **Încredere și credibilitate:** activitatea, consistența și expertiza trebuie să poată fi evaluate fără a expune date sensibile.
3. **Retenția creatorului:** utilizatorul simte că progresul și contribuțiile sale formează o identitate acumulativă, nu dispar în feed.
4. **Distribuție către alte module:** profilul trebuie să transforme conținutul social în acțiuni NovaFit: salvează un workout, încearcă un plan, citește un guide, urmărește autorul.

În forma actuală, profilul acoperă toate cele patru zone, dar nu le prioritizează. Posts, Workouts, Articles și Stats sunt tratate ca taburi egale, deși au valoare, frecvență și public diferite.

### Job-to-be-done principal

Vizitatorul ajunge de regulă din Feed, Discover, comments sau search și vrea să decidă în câteva secunde:

- persoana are un obiectiv/stil compatibil cu mine?
- este activă și consecventă?
- postează lucruri utile sau doar ocazionale?
- merită Follow, Message sau folosirea unui workout creat de ea?

Ownerul vrea altceva:

- să vadă cum este reprezentat;
- să publice rapid;
- să organizeze ce rămâne vizibil;
- să înțeleagă ce conținut produce valoare.

Pagina actuală servește mai bine ownerul decât vizitatorul, deoarece oferă multe acțiuni de administrare, dar puține semnale de relevanță și dovadă socială pentru decizia de Follow.

## 2. Posts — scop, valoare și limite

### Scopul corect

Posts trebuie să fie **jurnalul social cu frecvență mare**:

- progres și momente din antrenament;
- fotografie sau update scurt;
- workout/meal/activity share;
- întrebare, milestone sau context personal;
- conținut cu viață scurtă sau medie, optimizat pentru conversație.

### Valoare business

- Cost mic de creare: maximum 500 de caractere și imagine opțională.
- Produce supply pentru Feed și Discover.
- Creează motive dese de revenire.
- Susține likes, comments, share și follow.
- Poate conecta natural modulele de workout și nutrition cu socialul.
- Este potrivit atât pentru creatorii experimentați, cât și pentru utilizatorii obișnuiți.

### Probleme actuale

1. **Profilul afișează Posts ca grid vizual, dar produsul acceptă și text-only.** Celulele text sunt mai slabe vizual și pot părea conținut secundar.
2. **Grid-ul elimină contextul social.** Nu se văd imediat likes, comments, tipul conținutului sau data; vizitatorul nu poate identifica rapid „best content”.
3. **Nu există pin/featured.** Cele mai valoroase postări sunt îngropate cronologic.
4. **Postările legate de workout/meal nu sunt folosite în profil ca dovadă structurată.** Ele ar putea arăta tipul activității fără a expune macros/calories.
5. **Counterul Posts nu descrie conținutul vizibil.** Backend-ul numără toate postările active, inclusiv feed posts generate pentru Articles, dar tabul Posts exclude `ArticleId != null`. Counterul poate fi mai mare decât numărul real de Posts accesibile.
6. **Profilul nu oferă analytics creatorului.** Nu există profile views, post reach, saves sau follow conversion.

### Recomandare pentru Posts

Păstrează formatul, dar schimbă prezentarea din simplă galerie în **Activity/Posts cu două moduri**:

- default: listă compactă sau masonry care păstrează contextul, tipul și engagement-ul;
- opțional: grid media pentru utilizatorii cu multe imagini.

Adaugă:

- până la 3 pinned items;
- chips pentru `Workout`, `Meal`, `Progress`, `Question` bazate pe linked content, nu pe tagging manual obligatoriu;
- likes/comments și data în preview;
- filtru `All / Media / Workouts / Milestones` doar după ce există suficient volum;
- acțiune `Use workout` sau `View workout` pentru conținutul legat;
- draft/save later doar dacă abandonul composerului justifică investiția.

## 3. Articles — scop, valoare și limite

### Scopul care ar justifica existența

Articles merită un produs separat numai dacă reprezintă **knowledge evergreen**:

- ghiduri explicative;
- programe și metodologii;
- experiențe documentate cu concluzii reutilizabile;
- educație despre tehnică, recovery, obiceiuri și progres;
- conținut ce poate fi căutat, salvat și recitit.

Acest format poate crește autoritatea creatorilor și valoarea organică a catalogului NovaFit. Este util mai ales pentru coaches, power users, creatori verificați și utilizatori care documentează experiențe reale.

### Valoare business potențială

- Conținut cu viață mai lungă decât feed posts.
- Posibilitate de SEO/web acquisition dacă devine public și indexabil.
- O bază de knowledge specifică fitness-ului.
- Poate conduce către workouts/templates și poate susține monetizare viitoare a creatorilor.
- Oferă motiv de Save/Bookmark și revenire.

### Probleme actuale

1. **Diferențiere semantică slabă.** Composerul permite Content obligatoriu, iar title/category/image sunt opționale. În practică, Article poate deveni doar un Post foarte lung.
2. **Calitatea minimă nu este protejată.** Un articol poate fi publicat fără titlu și categorie, deși acestea sunt esențiale pentru descoperire și înțelegere.
3. **Engagement-ul este fragmentat.** La publicare se creează un Post legat în Feed, iar like/comment aparțin postării, nu articolului ca obiect canonic. Article detail nu afișează like, comment, save, share count sau discussion.
4. **Dublare de reprezentare.** Articolul apare ca linked post în Feed și separat în Articles. În profil, Posts îl exclude, dar counterul general îl poate include.
5. **Nu există discovery pentru knowledge.** Category există, dar nu produce browse, search, related guides sau ranking.
6. **Nu există Save/Bookmark.** Fără o acțiune de consum amânat, valoarea long-form este mult redusă pe mobil.
7. **Nu există semnale de calitate.** Reading time, updated date, saves, helpful votes, author expertise și surse lipsesc.
8. **Editorul nu susține cu adevărat long-form.** Este text simplu; lipsesc headings, lists, sections, embeds, draft, preview și autosave.
9. **Risc de safety și trust.** Conținutul fitness/nutrition poate deveni medical sau periculos; nu există report reason specific, disclaimer, moderation sau separarea experienței personale de recomandări profesionale.

## 4. Merită păstrate ambele?

### Opțiunea A — Păstrezi Posts și elimini Articles

**Avantaje:** produs mai simplu, mai puțin cod, mai puțină moderare, supply concentrat în feed.  
**Dezavantaje:** pierzi knowledge evergreen, autoritatea creatorilor și posibilitatea de SEO/saves.

Această opțiune este corectă dacă Articles are foarte puțini creatori și foarte puțin consum după lansare.

### Opțiunea B — Le unești într-un singur format flexibil

**Avantaje:** un composer, un model de engagement, o singură listă.  
**Dezavantaje:** feed-ul devine eterogen, long-form nu primește discovery/editorul necesar, iar utilizatorul nu înțelege diferența dintre update și ghid.

Nu recomand această variantă ca destinație finală. Reduce complexitatea tehnică, dar diluează scopul ambelor formate.

### Opțiunea C — Păstrezi ambele, cu roluri strict diferite

**Posts = conversation și progress.**  
**Guides = knowledge și utility.**

Aceasta este recomandarea, cu o condiție: Guides primește capabilități proprii și este validat prin date. Dacă nu există resurse pentru editor, Save, discovery și analytics, este mai eficient ca Articles să fie ascuns temporar decât menținut ca funcție incomplet diferențiată.

### Recomandarea concretă

- Redenumește `Articles` în `Guides` sau `Knowledge`.
- Fă title obligatoriu și category recomandată/obligatorie.
- Introdu un prag minim rezonabil pentru body sau o structură ghidată, fără a încuraja text artificial de lung.
- Article/Guide devine obiectul canonic pentru save, share, view și discussion.
- Linked feed post devine doar unitate de distribuție și deschide Guide-ul; engagement-ul trebuie agregat sau asociat clar cu obiectul canonic.
- În profil, Guide-ul apare numai în Guides, iar Activity poate afișa evenimentul „Published a guide” fără a-l număra ca Post obișnuit.

## 5. Structura recomandată a profilului

### Header

Păstrează avatar, display name, verified, bio, Follow/Message și counters, dar adaugă semnale care ajută relevanța:

- fitness focus/goal public ales explicit;
- nivel sau rol autodeclarat: athlete, coach, beginner, creator;
- 1–3 topic tags;
- privacy-safe consistency indicator;
- un singur CTA primar în funcție de owner/visitor.

Nu afișa automat weight, calories, BMI sau alte date de sănătate.

### Featured strip

Sub header, adaugă maximum 3 elemente pinned, mixte:

- un Post reprezentativ;
- un Guide util;
- un Workout public reutilizabil.

Aceasta ajută creatorul să își explice identitatea și vizitatorul să decidă rapid dacă dă Follow.

### Tabs recomandate

1. **Activity** — Posts și evenimente relevante, fără dublarea Guides complete.
2. **Workouts** — templates/activitate publică, cu `Preview` și eventual `Save/Use`.
3. **Guides** — knowledge evergreen, searchabil și salvabil.
4. **Stats** — dovadă de consistență privacy-safe.

Pentru profiluri fără Guides, tabul poate fi ascuns vizitatorului. Ownerul îl vede cu empty state educațional. Astfel nu se consumă spațiu permanent pentru un format nefolosit.

## 6. UX audit

### Probleme de înțelegere

- `Create` deschide alegerea Post/Article, dar utilizatorul nu primește o explicație scurtă despre când se folosește fiecare.
- Posts și Articles folosesc prezentări complet diferite, însă diferența de valoare nu este exprimată verbal.
- Workouts pare bibliotecă, Posts galerie, Articles feed editorial, Stats dashboard; pagina cere patru modele mentale.
- Nu există un overview/featured state; vizitatorul trebuie să inspecteze manual fiecare tab.
- Empty states descriu lipsa conținutului, nu beneficiul publicării.

### Recomandări UX

- În composer: `Update` — „Share progress or start a conversation”; `Guide` — „Publish reusable knowledge”.
- Permite `Convert to Guide` când un Post depășește o anumită structură/lungime, fără a forța utilizatorul.
- Autosave draft pentru Guides; nu este necesar inițial pentru Posts.
- Preview înainte de publicare pentru Guides.
- Reading time, Save și related guides în detail.
- Un singur click pe card deschide detail; expandarea inline a textului și `Open article` nu trebuie să concureze.
- Păstrează tabul activ și scrollul la revenire.
- Afișează succesul publicării și locul unde a fost distribuit: „Guide published and shared to your followers”.

## 7. Design audit

### Direcție potrivită produsului

**Domeniu:** progres, antrenament, ritm, recovery, disciplină, comunitate, expertiză.  
**Lume cromatică:** obsidianul echipamentelor, violetul energiei NovaFit, albul cretei, griurile metalului, verdele discret al progresului și roșul exclusiv pentru risc/destructive.  
**Semnătură recomandată:** `proof of practice` — fiecare profil arată legătura dintre ce spune utilizatorul, ce antrenează și ce știe, fără a expune metrici sensibile.  
**Default-uri de respins:** profil tip Instagram centrat doar pe poze; blog generic separat de produs; dashboard cu multe carduri egale.

### Ce trebuie schimbat

- Posts grid este scanabil, dar nu transmite importanță sau context. Adaugă metadata discretă și featured hierarchy.
- Articles folosește carduri mari cu avatarul repetat pentru fiecare articol, deși autorul este deja contextul întregii pagini. Repetiția consumă spațiu fără valoare.
- Article preview are prea multe niveluri: card social, image, embedded article card, expand, open. Simplifică la cover mic + category + title + excerpt + reading time.
- Taburile au greutate egală chiar când unele sunt goale. Ascunderea contextuală și counters separate reduc zgomotul.
- Profilul are nevoie de un focal point. Recomandarea este Featured/Latest activity, nu counters sau tab bar.
- Păstrează strategia vizuală flat/borders subtile și un singur accent violet. Nu adăuga noi culori decorative pentru tipurile de conținut.

## 8. Ce poate fi adăugat pentru eficiență

### P0 — Claritate și măsurare

- Corectează counters: `Posts`, `Guides`, `Workouts` separat.
- Instrumentează funnelurile de create și consume.
- Elimină reprezentarea duplicată a Article în profil.
- Adaugă Featured/Pinned.
- Explică Post vs Guide în composer.

### P1 — Valoare pentru consumator

- Save/Bookmark pentru Guides și Workouts.
- Like/comment/share canonic pentru Guides.
- Reading time și related guides.
- `Use workout` / `Save workout` cu privacy review.
- Search/category browse pentru Guides.
- Profile relevance tags și topic affinity.

### P2 — Valoare pentru creator

- Profile views, content reach, saves și follows generated.
- Draft/autosave/preview pentru Guides.
- Creator insights: top content, completion/read rate și saves.
- Serii de Guides și colecții tematice.
- Content prompts bazate pe activitatea reală: „Transformă progresul săptămânii într-un update”.

### Ce nu recomand acum

- Monetizare înainte de existența supply-ului și a engagement-ului stabil.
- Badge-uri/gamification pentru volum de posting; ar crește conținutul slab.
- Editor rich-text foarte complex înainte de validarea consumului de Guides.
- Mai multe tipuri noi de conținut în top-level navigation.
- Afișarea publică implicită a calories, weight sau macros.

## 9. Metrici necesare pentru decizie

### North-star local

**Profile-to-meaningful-action rate:** procentul vizitelor de profil care produc Follow, Save Guide, Save/Use Workout, Message sau deschiderea unui conținut.

### Posts

- creators weekly / viewers weekly;
- post creation completion rate;
- posts per active creator;
- impressions, unique viewers și engagement rate;
- profile visits și follows generate de un Post;
- procent text/image/linked workout/linked meal;
- delete/archive rate în primele 24 de ore.

### Guides

- guide creation start → publish conversion;
- creators care publică al doilea Guide în 30 de zile;
- open rate din Feed și Profile;
- median read depth/completion;
- saves per unique viewer;
- return-to-saved rate;
- follows și workout saves generate;
- report rate și moderation cost;
- procent de Guides fără titlu/categorie în implementarea actuală.

### Prag orientativ de păstrare

Guides merită investiție separată dacă, după îmbunătățirea minimă a produsului:

- are un nucleu repetitiv de creatori, nu doar publicări unice;
- produce semnificativ mai multe Saves per view decât Posts;
- are consum recurent din search/profile, nu doar clickuri din feed;
- generează Follow sau Workout Save peste baseline-ul Posts;
- costul de moderare rămâne acceptabil.

Dacă aceste semnale nu apar, recomandarea este retragerea tabului pentru majoritatea utilizatorilor și păstrarea Guides doar pentru creatori verificați/curatori până la o nouă validare.

## 10. Experimente recomandate

### Experiment 1 — Naming și intent

Compară `Post / Article` cu `Update / Guide`, fiecare cu descriere de o propoziție. Măsoară alegerea formatului, abandonul și calitatea minimă a conținutului.

### Experiment 2 — Featured profile

Adaugă până la 3 pinned items pentru un cohort. Măsoară profile-to-follow și content open rate.

### Experiment 3 — Guides Save

Adaugă Save și un entry point `Saved`. Măsoară save rate, revenirea la 7/30 zile și efectul asupra retenției.

### Experiment 4 — Tab visibility

Ascunde Guides pentru vizitatori când profilul nu are conținut. Măsoară timpul până la prima acțiune și rata de abandon a profilului.

### Experiment 5 — Activity list vs grid

Compară grid-ul actual cu un Activity layout ce include context și engagement. Măsoară content opens, likes/comments și timpul până la Follow.

## 11. Roadmap recomandat

### Faza 1 — 1–2 sprinturi

1. Corectează counters și denumirea tipurilor.
2. Adaugă event tracking pentru funnelurile principale.
3. Ascunde taburile goale pentru vizitator.
4. Simplifică Article cards și elimină dublarea din profil.
5. Adaugă pinned/featured minimum viable.

### Faza 2 — 2–4 sprinturi

1. Guides: title/category, reading time, Save și share canonic.
2. Workouts: Preview + Save/Use cu privacy review.
3. Activity layout cu metadata și linked content clar.
4. Creator insights de bază.

### Faza 3 — doar după validare

1. Search și discovery pentru Guides.
2. Draft/autosave/editor structurat.
3. Collections/series.
4. Public web/SEO și eventual creator monetization.

## Decizie recomandată

**Păstrează ambele formate, dar nu în forma conceptuală actuală.** Posts rămâne motorul social de frecvență. Articles devine Guides — un strat de knowledge evergreen, cu Save, discovery, structură și analytics proprii. Dacă NovaFit nu dorește să investească în aceste diferențiatoare, Articles trebuie eliminat sau limitat, deoarece în forma actuală adaugă complexitate fără un job suficient de distinct.

Prima schimbare nu trebuie să fie un redesign mare. Trebuie să fie clarificarea modelului de produs, corectarea counterelor și instrumentarea. După date reale, se poate decide justificat dacă Guides devine un avantaj competitiv sau un feature cu adopție insuficientă.
