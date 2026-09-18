import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { verifyPassword } from "better-auth/crypto";
import { betterAuth } from "better-auth";
import { and, count, eq, sql } from "drizzle-orm";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { z } from "zod";

import * as schema from "@/server/db/schema";

const DEMO = {
  feedback: [
    {
      description: "Let visitors see the changes that affect their workflow before they ship.",
      id: "10000000-0000-4000-8000-000000000001",
      status: "under_review" as const,
      title: "Email notifications for updates",
    },
    {
      description: "Allow teams to discuss alternatives alongside an individual feedback request.",
      id: "10000000-0000-4000-8000-000000000002",
      status: "planned" as const,
      title: "Add lightweight discussion threads",
    },
    {
      description: "Make it easier to see which ideas are gaining support during the week.",
      id: "10000000-0000-4000-8000-000000000003",
      status: "in_progress" as const,
      title: "Weekly feedback digest",
    },
    {
      description: "Give project owners an export they can use in their product planning process.",
      id: "10000000-0000-4000-8000-000000000004",
      status: "completed" as const,
      title: "CSV feedback export",
    },
  ],
  name: "FeedbackFlow Demo",
  projectDescription: "A live demo board for collecting product feedback and sharing a public roadmap.",
  projectId: "00000000-0000-4000-8000-000000000001",
  slug: "demo",
};

type DemoTemplate = typeof DEMO;

type SeedEnvironment = {
  baseURL: string;
  databaseUrl: string;
  email: string;
  password: string;
  secret: string;
};

type SeedAuth = {
  api: {
    signUpEmail(input: {
      body: { email: string; name: string; password: string };
    }): Promise<{ user?: { id: string } | null }>;
  };
};

/** 要求显式确认并使用 direct 管理连接，防止 Seed 静默回退到测试或应用运行时连接。 */
export function readSeedEnvironment(
  environment: Record<string, string | undefined> = process.env,
): SeedEnvironment {
  if (environment.DEMO_SEED_CONFIRM !== "true") {
    throw new Error("Set DEMO_SEED_CONFIRM=true before writing demo data.");
  }
  const databaseUrl = environment.DATABASE_URL_UNPOOLED?.trim();
  const secret = environment.BETTER_AUTH_SECRET?.trim();
  const baseURL = environment.BETTER_AUTH_URL?.trim();
  const email = environment.DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = environment.DEMO_USER_PASSWORD;
  if (!databaseUrl || !secret || !baseURL || !email || !password) {
    throw new Error("DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DEMO_USER_EMAIL, and DEMO_USER_PASSWORD are required.");
  }
  if (secret.length < 32 || password.length < 8 || password.length > 128) {
    throw new Error("Demo seed credentials do not meet minimum length requirements.");
  }
  if (!z.email().safeParse(email).success) {
    throw new Error("DEMO_USER_EMAIL must be a valid email address.");
  }
  try {
    const database = new URL(databaseUrl);
    const authURL = new URL(baseURL);
    if (!["postgres:", "postgresql:"].includes(database.protocol)) {
      throw new Error("invalid database protocol");
    }
    if (database.hostname.includes("-pooler.")) {
      throw new Error("pooled database endpoint");
    }
    if (!["http:", "https:"].includes(authURL.protocol)) {
      throw new Error("invalid auth protocol");
    }
  } catch {
    throw new Error("Demo seed requires a direct PostgreSQL URL and an HTTP(S) Better Auth URL.");
  }
  return { baseURL, databaseUrl, email, password, secret };
}

/** 已存在账号必须用环境中的演示密码验证，避免误接管同邮箱但由其他人创建的账户。 */
async function ensureDemoUser(
  database: NeonDatabase<typeof schema>,
  auth: SeedAuth,
  environment: SeedEnvironment,
  demo: DemoTemplate,
) {
  const [existing] = await database.select({ id: schema.user.id }).from(schema.user)
    .where(eq(schema.user.email, environment.email)).limit(1);
  if (!existing) {
    const result = await auth.api.signUpEmail({
      body: { email: environment.email, name: demo.name, password: environment.password },
    });
    if (!result.user?.id) throw new Error("Better Auth did not create the demo user.");
    return result.user.id;
  }

  const [credential] = await database.select({ password: schema.account.password })
    .from(schema.account)
    .where(and(
      eq(schema.account.userId, existing.id),
      eq(schema.account.providerId, "credential"),
      eq(schema.account.accountId, existing.id),
    )).limit(1);
  if (!credential?.password || !await verifyPassword({
    hash: credential.password,
    password: environment.password,
  })) {
    throw new Error("Demo user ownership could not be verified.");
  }
  return existing.id;
}

/** 仅补充缺失的固定项目和反馈；同 ID 或 Slug 的归属不符即失败，绝不覆盖已有用户内容。 */
async function ensureDemoProjectAndFeedback(
  database: NeonDatabase<typeof schema>,
  userId: string,
  demo: DemoTemplate,
) {
  await database.transaction(async (transaction) => {
    // 与公开反馈写入共享 project advisory lock，避免 Seed 绕过 50 条免费套餐上限。
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${demo.projectId}))`);
    const [projectBySlug] = await transaction
      .select({ id: schema.projects.id, userId: schema.projects.userId })
      .from(schema.projects).where(eq(schema.projects.slug, demo.slug)).limit(1);
    if (projectBySlug && (projectBySlug.id !== demo.projectId || projectBySlug.userId !== userId)) {
      throw new Error("The demo slug is already owned by a different project.");
    }
    const [projectById] = await transaction
      .select({ id: schema.projects.id, userId: schema.projects.userId })
      .from(schema.projects).where(eq(schema.projects.id, demo.projectId)).limit(1);
    if (projectById && (projectById.userId !== userId || projectBySlug?.id !== demo.projectId)) {
      throw new Error("The demo project ID conflicts with existing data.");
    }
    if (!projectById) {
      await transaction.insert(schema.projects).values({
        description: demo.projectDescription,
        id: demo.projectId,
        isPublic: true,
        name: demo.name,
        slug: demo.slug,
        userId,
      });
    }

    const missingFeedback = [] as typeof demo.feedback;
    for (const item of demo.feedback) {
      const [existing] = await transaction
        .select({ projectId: schema.feedback.projectId, userId: schema.feedback.userId })
        .from(schema.feedback).where(eq(schema.feedback.id, item.id)).limit(1);
      if (existing && (existing.projectId !== demo.projectId || existing.userId !== userId)) {
        throw new Error("A fixed demo feedback ID conflicts with existing data.");
      }
      if (!existing) missingFeedback.push(item);
    }
    const [currentTotal] = await transaction.select({ value: count() })
      .from(schema.feedback).where(eq(schema.feedback.projectId, demo.projectId));
    if (Number(currentTotal?.value ?? 0) + missingFeedback.length > 50) {
      throw new Error("Demo feedback would exceed the project feedback limit.");
    }
    if (missingFeedback.length) {
      await transaction.insert(schema.feedback).values(missingFeedback.map((item) => ({
        description: item.description,
        id: item.id,
        isPublic: true,
        projectId: demo.projectId,
        status: item.status,
        title: item.title,
        userId,
      })));
    }
  });
}

/** 通过 Better Auth 创建或验证演示身份后，幂等补齐公开 /p/demo 所需的固定数据。 */
export async function seedDemo(
  environment: SeedEnvironment = readSeedEnvironment(),
  demo: DemoTemplate = DEMO,
) {
  const database = drizzle(environment.databaseUrl, { schema });
  const auth = betterAuth({
    baseURL: environment.baseURL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
      transaction: true,
    }),
    emailAndPassword: {
      autoSignIn: false,
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 8,
    },
    logger: {
      level: "error",
      log(level) {
        console.error(JSON.stringify({ component: "demo-seed-auth", level, message: "Authentication seed operation failed." }));
      },
    },
    secret: environment.secret,
  });
  try {
    const userId = await ensureDemoUser(database, auth, environment, demo);
    await ensureDemoProjectAndFeedback(database, userId, demo);
  } finally {
    await database.$client.end();
  }
}
