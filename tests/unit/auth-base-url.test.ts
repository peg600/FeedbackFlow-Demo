import { describe, expect, it } from "vitest";

import { createAuthBaseURL } from "@/server/auth/base-url";

describe("Better Auth base URL", () => {
  it("keeps a static URL outside Vercel Preview", () => {
    expect(
      createAuthBaseURL({
        configuredURL: "https://feedback-flow-demo.vercel.app",
        vercelEnvironment: "production",
      }),
    ).toBe("https://feedback-flow-demo.vercel.app");
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
  });
});
