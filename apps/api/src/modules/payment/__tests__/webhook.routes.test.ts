import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import rawBody from "fastify-raw-body";

// Use vi.hoisted to ensure mocks are defined before vi.mock factory executes
const { redisMock, mockEnv } = vi.hoisted(() => ({
  redisMock: {
    status: "ready",
    set: vi.fn(),
  },
  mockEnv: {
    XENDIT_WEBHOOK_TOKEN: "test-webhook-token",
    NODE_ENV: "test",
  } as Record<string, string | undefined>,
}));

vi.mock("@/lib/redis", () => ({
  redis: redisMock,
}));

vi.mock("@/config/env", () => ({
  env: mockEnv,
}));

// Mock rate-limiter to always pass
vi.mock("@/lib/rate-limit", () => ({
  requireRateLimitReady: () => undefined, // Pass through
}));

vi.mock("@/modules/payment/payment.service", () => ({
  paymentService: {
    handleWebhook: vi.fn().mockResolvedValue(null),
    createInvoice: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
  AuditAction: {
    PAYMENT_CREATED: "PAYMENT_CREATED",
    PAYMENT_UPDATED: "PAYMENT_UPDATED",
    SUBSCRIPTION_CHANGED: "SUBSCRIPTION_CHANGED",
  },
}));

import { paymentRoutes } from "@/modules/payment/payment.routes";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });
  await app.register(paymentRoutes, { prefix: "/payment" });
  await app.ready();
  return app;
}

describe("payment webhook", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    redisMock.status = "ready";
    redisMock.set.mockReset().mockResolvedValue("OK");
  });

  it("should reject invalid signatures", async () => {
    const payload = JSON.stringify({
      id: "inv_1",
      external_id: "ext",
      status: "PAID",
    });
    const response = await app.inject({
      method: "POST",
      url: "/payment/webhook",
      payload,
      headers: {
        "content-type": "application/json",
        "x-callback-token": "test-webhook-token",
        "x-callback-timestamp": Math.floor(Date.now() / 1000).toString(),
        "x-callback-signature": "invalid",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject stale timestamps", async () => {
    const payload = JSON.stringify({
      id: "inv_2",
      external_id: "ext",
      status: "PAID",
    });
    const timestamp = "100";
    const signature = "deadbeef";
    const response = await app.inject({
      method: "POST",
      url: "/payment/webhook",
      payload,
      headers: {
        "content-type": "application/json",
        "x-callback-token": "test-webhook-token",
        "x-callback-timestamp": timestamp,
        "x-callback-signature": signature,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject replayed payloads", async () => {
    const payload = JSON.stringify({
      id: "inv_3",
      external_id: "ext",
      status: "PAID",
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const crypto = await import("node:crypto");
    const signature = crypto
      .createHmac("sha256", "test-webhook-token")
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    redisMock.set.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "POST",
      url: "/payment/webhook",
      payload,
      headers: {
        "content-type": "application/json",
        "x-callback-token": "test-webhook-token",
        "x-callback-timestamp": timestamp,
        "x-callback-signature": signature,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
