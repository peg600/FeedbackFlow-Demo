// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ process: vi.fn() }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/features/billing/server/sync", () => ({ processPaddleEvent: mocks.process }));
import { POST } from "@/app/api/paddle/webhook/route";

const secret = "webhook-unit-fixture-secret";
const body = JSON.stringify({ event_id: `evt_${"a".repeat(26)}`, event_type: "future.new-event", occurred_at: "2026-09-21T00:00:00Z", data: {} });

/** 用真实 HMAC 与 Paddle SDK 验签，测试不会调用任何外部支付 API。 */
function request(payload = body, signedPayload = payload, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}:${signedPayload}`).digest("hex");
  return new Request("https://app.example/api/paddle/webhook", { method: "POST", body: payload, headers: { "paddle-signature": `ts=${timestamp};h1=${signature}` } });
}

describe("Paddle webhook boundary", () => {
  beforeEach(() => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_sdbx_apikey_fixture");
    vi.stubEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", secret);
    vi.stubEnv("PADDLE_PRICE_ID_PRO", `pri_${"a".repeat(26)}`);
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_fixture");
    mocks.process.mockReset().mockResolvedValue("ignored");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it("verifies the exact raw body with the actual SDK before processing", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.process).toHaveBeenCalledWith({}, expect.objectContaining({ eventId: `evt_${"a".repeat(26)}`, eventType: "future.new-event" }), `pri_${"a".repeat(26)}`);
  });
  it("rejects tampering, stale and future timestamps before database writes", async () => {
    expect((await POST(request(`${body} `, body))).status).toBe(503);
    expect((await POST(request(body, body, Math.floor(Date.now() / 1000) - 30))).status).toBe(503);
    expect((await POST(request(body, body, Math.floor(Date.now() / 1000) + 30))).status).toBe(503);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("does not acknowledge failures or expose upstream errors", async () => {
    mocks.process.mockRejectedValue(new Error("private SQL and payment data"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private SQL");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private SQL");
  });
  it("fails closed on missing sandbox configuration", async () => {
    vi.stubEnv("PADDLE_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.process).not.toHaveBeenCalled();
  });
});
