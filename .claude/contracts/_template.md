# API Contract Template

Copy this file to `.claude/contracts/[feature-name].md` when starting a new feature.

---

## Contract: [Feature Name]

**Status:** `DRAFT` | `BACKEND_READY` | `COMPLETE`
**Author:** @tech-architect
**Date:** [date]

---

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/[resource] | Bearer | [description] |
| POST | /api/[resource] | Bearer | [description] |

---

### Request DTOs

```csharp
public record Create[Feature]Request(
    string Field1,
    int Field2
);
```

---

### Response DTOs

```csharp
public record [Feature]Response(
    int Id,
    string Field1,
    int Field2,
    DateTime CreatedAt
);
```

---

### TypeScript Interfaces (fit-app/src/app/core/models/)

```typescript
export interface [Feature] {
  id: number;
  field1: string;
  field2: number;
  createdAt: string;
}

export interface Create[Feature]Request {
  field1: string;
  field2: number;
}
```

---

### Error Responses (ProblemDetails)

| Status | When |
|--------|------|
| 400 | Validation failure |
| 401 | Missing/invalid JWT |
| 403 | Not owner of resource |
| 404 | Resource not found |
| 500 | Unexpected error |

---

### Notes for @dotnet-developer

- [ ] Create entity in `Models/Entities/`
- [ ] Create DTOs in `Models/DTOs/`
- [ ] Implement service + interface in `Services/`
- [ ] Create controller in `Controllers/`
- [ ] Register in `Program.cs`
- [ ] Add migration: `dotnet ef migrations add [Name]`

### Notes for @angular-developer

- [ ] Create interface in `core/models/[feature].model.ts`
- [ ] Create API service in `api/[feature].service.ts`
- [ ] Create facade in `core/facade/[feature].facade.ts`
- [ ] Create feature components in `features/[feature]/`
- [ ] Register lazy route in `app.routes.ts`

---

### Implementation Log

```
[date] - DRAFT created by @tech-architect
[date] - BACKEND_READY confirmed by @dotnet-developer
[date] - COMPLETE confirmed by @angular-developer
```
