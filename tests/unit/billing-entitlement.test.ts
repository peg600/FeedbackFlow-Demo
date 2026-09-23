import { describe, expect, it } from "vitest";

import { hasProEntitlement } from "@/features/billing/entitlement";
import { readPaddleConfig } from "@/features/billing/server/config";
import { parseSubscriptionSnapshot } from "@/features/billing/server/sync";

const now = new Date("2026-09-21T12:00:00Z");
const priceId = `pri_${"a".repeat(26)}`;
const active = { status: "active", priceId, currentPeriodEnd: new Date("2026-10-01T00:00:00Z"), scheduledAction: null, scheduledChangeAt: null };

describe("Pro entitlement", () => {
  it("grants only current, configured active Pro subscriptions", () => {
    expect(hasProEntitlement(active, priceId, now)).toBe(true);
    for (const status of ["trialing", "past_due", "paused", "canceled", "unknown"]) {
      expect(hasProEntitlement({ ...active, status }, priceId, now)).toBe(false);
    }
    expect(hasProEntitlement(active, undefined, now)).toBe(false);
    expect(hasProEntitlement(active, "other-price", now)).toBe(false);
    expect(hasProEntitlement({ ...active, currentPeriodEnd: null }, priceId, now)).toBe(false);
    expect(hasProEntitlement({ ...active, currentPeriodEnd: now }, priceId, now)).toBe(false);
    expect(hasProEntitlement({ ...active, currentPeriodEnd: new Date("invalid") }, priceId, now)).toBe(false);
  });

  it("retains scheduled cancellations until the exact effective time", () => {
    const canceled = { ...active, scheduledAction: "cancel", scheduledChangeAt: new Date(now.getTime() + 1) };
    expect(hasProEntitlement(canceled, priceId, now)).toBe(true);
    expect(hasProEntitlement({ ...canceled, scheduledChangeAt: now }, priceId, now)).toBe(false);
    expect(hasProEntitlement({ ...canceled, scheduledAction: "pause", scheduledChangeAt: now }, priceId, now)).toBe(false);
  });
});

describe("Paddle snapshot validation", () => {
  const sub = { id: `sub_${"a".repeat(26)}`, customerId: `ctm_${"a".repeat(26)}`, status: "active", updatedAt: "2026-09-21T12:00:00.123456Z",
    currentBillingPeriod: { endsAt: "2026-10-21T12:00:00Z" }, scheduledChange: null,
    items: [{ price: { id: priceId }, quantity: 1, status: "active" }] };
  it("retains provider microsecond version and rejects unknown or multiple prices", () => {
    expect(parseSubscriptionSnapshot(sub, priceId)).toMatchObject({ priceId, providerUpdatedAt: sub.updatedAt });
    expect(parseSubscriptionSnapshot(sub, "other").priceId).toBeNull();
    expect(parseSubscriptionSnapshot({ ...sub, items: [...sub.items, ...sub.items] }, priceId).priceId).toBeNull();
    expect(parseSubscriptionSnapshot({ ...sub, items: [{ price: null, quantity: 1, status: "active" }] }, priceId).priceId).toBeNull();
  });
});

describe("Paddle sandbox environment", () => {
  const config = { NODE_ENV: "test", PADDLE_API_KEY: "pdl_sdbx_apikey_fixture", PADDLE_NOTIFICATION_WEBHOOK_SECRET: "fixture-secret-only", PADDLE_PRICE_ID_PRO: priceId, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_fixture" };
  it("requires complete sandbox credentials and never accepts Live keys", () => {
    expect(readPaddleConfig(config)).not.toBeNull();
    expect(readPaddleConfig({ ...config, PADDLE_API_KEY: "pdl_live_apikey_fixture" })).toBeNull();
    expect(readPaddleConfig({ ...config, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "live_fixture" })).toBeNull();
    expect(readPaddleConfig({ ...config, PADDLE_NOTIFICATION_WEBHOOK_SECRET: "" })).toBeNull();
  });
});
