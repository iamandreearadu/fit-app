# Implementare — eliminare Articles din Social

**Data:** 2026-07-22  
**Decizie sursă:** `business-audit-2026-07-22-social-profile.md`  
**Status:** implementat și verificat.

## Rezultat de produs

Social folosește acum un singur format editorial public: `Post`.

- Social/Profile are taburile `Posts`, `Workouts`, `Stats`.
- Butonul Create deschide direct composerul de Post.
- Feed și action sheet deschid direct composerul de Post, fără alegere Post/Article.
- Ruta `/social/article/:id` a fost eliminată.
- Endpointurile Social pentru listare, creare, editare, arhivare, ștergere și citire Articles au fost eliminate din controller.
- Postările legacy legate de Articles nu mai apar în Feed, Discover, Profile Posts sau Archived Posts.
- Counterul Posts numără numai postări reale (`ArticleId == null`).

## Frontend eliminat

- componenta Article Detail;
- composerul mixt Create Content;
- componenta Write Article;
- ruta lazy Article Detail;
- tabul Articles din navigația Social/Profile;
- încărcarea Articles la intrarea pe profil;
- acțiunile Article din componenta activă Social/Profile;
- excepția de layout global pentru ruta Article.

Composerul existent `CreatePostComponent` este acum folosit de:

- Feed;
- Social/Profile;
- create action sheet.

## Backend

Au fost eliminate rutele:

- `GET /api/social/profile/{userId}/blogs`;
- `GET /api/social/profile/{userId}/blogs/archived`;
- `POST /api/social/profile/blogs/create`;
- `PUT /api/social/profile/blogs/{id}`;
- `PATCH /api/social/profile/blogs/{id}/archive`;
- `DELETE /api/social/profile/blogs/{id}`;
- `GET /api/social/articles/{id}`.

Query-urile Feed/Discover/Profile/Archived și counterul Posts filtrează acum `ArticleId == null`.

## Date și rollback

Nu a fost creată o migrare distructivă. `BlogPost`, relația legacy `Post.ArticleId` și datele existente rămân în baza de date deoarece:

1. zona editorială generală a aplicației folosește în continuare `BlogPost`;
2. ștergerea conținutului utilizatorilor ar fi ireversibilă;
3. rollback-ul variantei de produs rămâne posibil.

Contractele/service methods interne legacy care nu mai au controller sau entry point pot fi eliminate într-o migrare tehnică separată după perioada de validare. Ele nu mai sunt accesibile ca funcție Social.

## Fișiere principale modificate

- `FitApp.Api/Controllers/SocialController.cs`
- `FitApp.Api/Services/SocialService.cs`
- `fit-app/src/app/app.component.ts`
- `fit-app/src/app/features/social/social.routes.ts`
- `fit-app/src/app/features/social/feed/social-feed.component.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.ts`
- `fit-app/src/app/features/social/social-profile/social-profile.component.html`
- `fit-app/src/app/shared/components/create-action-sheet/create-action-sheet.component.ts`

Fișiere eliminate:

- `fit-app/src/app/features/social/article-detail/*`
- `fit-app/src/app/features/social/components/create-content/*`
- `fit-app/src/app/features/social/components/write-article/*`

## Verificări

- Backend build în output separat: succes, 0 warnings, 0 errors.
- Angular development build: succes.
- Teste targetate SocialProfileFacade: 5/5 succes.
- `git diff --check`: fără erori de whitespace.

## Criterii de acceptare îndeplinite

- Utilizatorul nu mai poate crea Article din niciun entry point Social.
- Profilul nu mai afișează tab Articles.
- URL-ul Article nu mai este rutabil în aplicație.
- API-ul Social nu mai expune operații Article.
- Articles legacy nu mai intră în feed și nu mai afectează counterul Posts.
- Datele existente nu sunt șterse.
