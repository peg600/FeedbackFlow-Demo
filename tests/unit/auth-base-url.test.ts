import { describe, expect, it } from "vitest";
import { betterAuth, resolveBaseURL } from "better-auth";

import { createAuthBaseURL } from "@/server/auth/base-url";

describe("Better Auth base URL", () => {
  it("keeps a static URL outside Vercel deployments", () => {
    expect(
      createAuthBaseURL({
        configuredURL: "http://localhost:3000",
        vercelEnvironment: "development",
      }),
    ).toBe("http://localhost:3000");
  });

  it("allows only the configured, deployment, and branch hosts", () => {
    expect(
      createAuthBaseURL({
        configuredURL: "https://preview.example.com",
        vercelEnvironment: "preview",
        vercelURL: "feedback-flow-demo-abc123xyz-team.vercel.app",
        vercelBranchURL:
          "feedback-flow-demo-git-develop-team.vercel.app",
      }),
    ).toEqual({
      allowedHosts: [
        "preview.example.com",
        "feedback-flow-demo-abc123xyz-team.vercel.app",
        "feedback-flow-demo-git-develop-team.vercel.app",
      ],
      protocol: "https",
    });
  });

  it("allows the canonical and generated Production hosts", () => {
    const deploymentHost =
      "feedback-flow-demo-894fifl4c-pegpaul7-3634s-projects.vercel.app";
    const baseURL = createAuthBaseURL({
      configuredURL: "https://feedback-flow-demo.vercel.app",
      vercelEnvironment: "production",
      vercelURL: deploymentHost,
      vercelBranchURL:
        "feedback-flow-demo-git-main-pegpaul7-3634s-projects.vercel.app",
    });

    expect(baseURL).toEqual({
      allowedHosts: [
        "feedback-flow-demo.vercel.app",
        deploymentHost,
        "feedback-flow-demo-git-main-pegpaul7-3634s-projects.vercel.app",
      ],
      protocol: "https",
    });
    expect(
      resolveBaseURL(
        baseURL,
        "/api/auth",
        new Request(`https://${deploymentHost}/api/auth/sign-up/email`, {
          headers: {
            host: deploymentHost,
            "x-forwarded-host": "attacker.vercel.app",
          },
        }),
        undefined,
        false,
      ),
    ).toBe(`https://${deploymentHost}/api/auth`);
  });

  it("accepts same-origin auth requests from a generated Production host", async () => {
    const deploymentHost =
      "feedback-flow-demo-894fifl4c-pegpaul7-3634s-projects.vercel.app";
    const baseURL = createAuthBaseURL({
      configuredURL: "https://feedback-flow-demo.vercel.app",
      vercelEnvironment: "production",
      vercelURL: deploymentHost,
    });
    const auth = betterAuth({
      baseURL,
      secret: "test-secret-that-is-at-least-32-characters",
      emailAndPassword: { enabled: true },
      advanced: { trustedProxyHeaders: false },
    });

    const response = await auth.handler(
      new Request(`https://${deploymentHost}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: deploymentHost,
          origin: `https://${deploymentHost}`,
        },
        body: JSON.stringify({
          email: "production-origin@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
  });

  it("does not include an arbitrary Preview host", () => {
    const baseURL = createAuthBaseURL({
      configuredURL: "https://feedback-flow-demo-abc123xyz-team.vercel.app",
      vercelEnvironment: "preview",
      vercelURL: "feedback-flow-demo-abc123xyz-team.vercel.app",
      vercelBranchURL: "feedback-flow-demo-git-feature-team.vercel.app",
    });

    expect(baseURL).not.toBeTypeOf("string");
    expect(baseURL).toEqual({
      allowedHosts: [
        "feedback-flow-demo-abc123xyz-team.vercel.app",
        "feedback-flow-demo-git-feature-team.vercel.app",
      ],
      protocol: "https",
    });
    expect(
      typeof baseURL === "string"
        ? []
        : baseURL.allowedHosts.includes("attacker.vercel.app"),
    ).toBe(false);
    expect(() =>
      resolveBaseURL(
        baseURL,
        "/api/auth",
        new Request("https://attacker.vercel.app/api/auth/sign-up/email", {
          headers: { host: "attacker.vercel.app" },
        }),
        undefined,
        false,
      ),
    ).toThrow("not in the allowed hosts list");
  });
});
