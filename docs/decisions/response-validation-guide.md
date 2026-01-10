# Response Validation Implementation Guide

## Zod Response Schemas for API Routes

Per Digitesia Backend Standards, all API endpoints MUST validate response output with Zod.

### Standard Response Schemas

Create reusable schemas in `/apps/api/src/schemas/responses.ts`:

```typescript
import { z } from 'zod';

/**
 * Standard success response wrapper
 */
export const successResponseSchema = \u003cT extends z.ZodType\u003e(dataSchema: T) =\u003e
  z.object({
    success: z.literal(true),
    data: dataSchema,
    requestId: z.string().optional(),
  });

/**
 * Standard error response
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string().optional(),
});

/**
 * Paginated response wrapper
 */
export const paginatedResponseSchema = \u003cT extends z.ZodType\u003e(itemSchema: T) =\u003e
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      hasMore: z.boolean(),
    }),
    requestId: z.string().optional(),
  });
```

### Example: User Auth Responses

```typescript
// apps/api/src/modules/auth/auth.schemas.ts

import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  role: z.enum(["USER", "ADMIN"]),
});

const subscriptionSchema = z.object({
  tier: z.enum(["FREE", "PRO", "ENTERPRISE"]),
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED"]),
  exportsUsed: z.number().int().nonnegative(),
  exportsLimit: z.number().int().nonnegative(),
  validUntil: z.date().nullable(),
});

export const loginResponseSchema = z.object({
  user: userSchema,
  subscription: subscriptionSchema.nullable(),
  accessToken: z.string(),
  expiresAt: z.date(),
});

export const registerResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  expiresAt: z.date(),
});

export const meResponseSchema = z.object({
  user: userSchema,
  subscription: subscriptionSchema.nullable(),
});
```

### Route Integration Example

```typescript
// apps/api/src/modules/auth/auth.routes.ts

import { loginResponseSchema } from "./auth.schemas";

fastify.post("/login", async (request, reply) => {
  // ... authentication logic ...

  const responseData = {
    user,
    subscription,
    accessToken: tokens.accessToken,
    expiresAt: tokens.accessExpiresAt,
  };

  // VALIDATE OUTPUT before sending
  const validated = loginResponseSchema.parse(responseData);

  return sendSuccess(reply, validated);
});
```

### Fastify Schema Integration

For automatic OpenAPI generation:

```typescript
fastify.post(
  "/login",
  {
    schema: {
      body: loginSchema,
      response: {
        200: zodToJsonSchema(successResponseSchema(loginResponseSchema)),
        400: zodToJsonSchema(errorResponseSchema),
        401: zodToJsonSchema(errorResponseSchema),
      },
    },
  },
  async (request, reply) => {
    // Handler logic
  }
);
```

## Implementation Checklist

- [ ] Create `/apps/api/src/schemas/responses.ts` with standard wrappers
- [ ] Add response schemas for each module:
  - [ ] auth.schemas.ts (login, register, refresh, me)
  - [ ] project.schemas.ts (list, get, create, update, delete)
  - [ ] export.schemas.ts (create, status, list, download)
  - [ ] payment.schemas.ts (create, verify, webhook)
  - [ ] prompt.schemas.ts (list, get, create, execute)
  - [ ] download.schemas.ts (create, status, list)
- [ ] Integrate validation in route handlers (all ~140 routes)
- [ ] Add to Fastify schema for OpenAPI generation

## Testing Response Validation

```typescript
// Example test
import { loginResponseSchema } from "./auth.schemas";

describe("Login Response Validation", () => {
  it("should validate correct response", () => {
    const response = {
      user: {
        id: "1",
        email: "test@example.com",
        name: "Test",
        avatarUrl: null,
        role: "USER",
      },
      subscription: null,
      accessToken: "token",
      expiresAt: new Date(),
    };

    expect(() => loginResponseSchema.parse(response)).not.toThrow();
  });

  it("should reject invalid email", () => {
    const response = {
      user: {
        id: "1",
        email: "invalid",
        name: "Test",
        avatarUrl: null,
        role: "USER",
      },
      subscription: null,
      accessToken: "token",
      expiresAt: new Date(),
    };

    expect(() => loginResponseSchema.parse(response)).toThrow();
  });
});
```

## Benefits

✅ **Type Safety** - Response structure enforced at runtime  
✅ **API Documentation** - Auto-generated OpenAPI specs  
✅ **Error Prevention** - Catch shape mismatches before client receives  
✅ **Refactoring Safety** - Schema changes caught immediately

## Estimated Effort

- Standard schemas creation: 2-3 hours
- Per-module response schemas: 1-2 hours each × 8 modules = 8-16 hours
- Route integration: ~5 minutes per route × 140 routes = ~12 hours
- Testing: 4-6 hours

**Total:** ~26-37 hours for complete coverage

## Priority Routes

Start with high-traffic/critical endpoints:

1. Auth endpoints (login, register, refresh)
2. Project CRUD
3. Export creation/status
4. Payment operations
