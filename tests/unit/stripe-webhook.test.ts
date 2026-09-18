import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/stripe/webhook/route";

describe("Stripe webhook stub", () => {
  it("returns the shared typed error shape while billing is unavailable", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body).toEqual({
      error: {
        code: "BILLING_NOT_IMPLEMENTED",
        message: "Billing is not available yet.",
        requestId: expect.any(String),
      },
    });
  });
});
