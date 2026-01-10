# Backend File Refactoring Plan

## Files Exceeding 400 LOC Limit

Per Digitesia Backend Standards, all files must be ≤400 LOC. The following files require refactoring:

### 1. auth.routes.ts (497 LOC - 97 over)

**Current Structure:**

- Single file with 4 route handlers (register, login, refresh, me)
- Inline business logic in route handlers

**Refactoring Plan:**

```
apps/api/src/modules/auth/
├── auth.routes.ts          (≤100 LOC - route definitions only)
├── handlers/
│   ├── register.handler.ts (≤150 LOC)
│   ├── login.handler.ts    (≤150 LOC)
│   ├── refresh.handler.ts  (≤200 LOC - complex token rotation)
│   └── me.handler.ts       (≤50 LOC)
└── services/
    └── token.service.ts    (≤200 LOC - token rotation logic)
```

**Benefits:**

- Each handler focused on single responsibility
- Easier testing and maintenance
- Clear separation of concerns

---

### 2. stream.service.ts (448 LOC - 48 over)

**Current Structure:**

- Mixed responsibilities: RTMP stream management + transcoding logic

**Refactoring Plan:**

```
apps/api/src/modules/stream/
├── stream.service.ts       (≤200 LOC -stream coordination)
├── services/
│   ├── rtmp.service.ts     (≤200 LOC - RTMP specific logic)
│   └── transcode.service.ts(≤150 LOC - transcoding)
```

**Benefits:**

- Clear separation RTMP vs transcoding concerns
- Easier to add new streaming protocols
- Better testability

---

### 3. admin.routes.ts (422 LOC - 22 over)

**Current Structure:**

- Multiple admin endpoints in single file
- Mixed user/subscription/stats logic

**Refactoring Plan:**

```
apps/api/src/modules/admin/
├── admin.routes.ts         (≤100 LOC - route definitions)
├── handlers/
│   ├── users.handler.ts    (≤150 LOC)
│   ├── subscriptions.handler.ts (≤150 LOC)
│   └── stats.handler.ts    (≤150 LOC)
```

**Benefits:**

- Grouped by resource type
- Easier access control per resource
- Clear admin API structure

---

### 4. ffmpeg-command-builder.ts (410 LOC - 10 over)

**Current Structure:**

- All FFmpeg command builders in one file
- Mix of simple and complex builders

**Refactoring Plan:**

```
apps/api/src/modules/export/ffmpeg/
├── command-builder.ts      (≤100 LOC - facade/entry point)
├── builders/
│   ├── basic.builder.ts    (≤150 LOC - trim, mux, encode)
│   ├── audio.builder.ts    (≤150 LOC - audio mix, effects)
│   └── effects.builder.ts  (≤200 LOC - video effects, transforms)
```

**Benefits:**

- Each builder focused on specific domain
- Easier to add new effects/encoders
- Clear builder selection logic

---

## Implementation Priority

1. **ffmpeg-command-builder.ts** (lowest risk, 10 LOC over)
2. **admin.routes.ts** (clear separation, 22 LOC over)
3. **stream.service.ts** (medium complexity, 48 LOC over)
4. **auth.routes.ts** (highest risk, critical path, 97 LOC over)

---

## Estimated Effort

- ffmpeg-command-builder: 2-3 hours
- admin.routes: 3-4 hours
- stream.service: 4-5 hours
- auth.routes: 5-6 hours

**Total:** ~15-18 hours for complete refactoring

---

## Testing Strategy

For each refactored file:

1. Run existing test suite (must pass)
2. Add integration tests for new structure
3. Verify no behavioral changes
4. Check line count compliance

---

## Success Criteria

- ✅ All files ≤400 LOC
- ✅ All existing tests pass
- ✅ No behavioral changes
- ✅ Improved code clarity and maintainability
