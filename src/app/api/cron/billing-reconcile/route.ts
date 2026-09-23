import { timingSafeEqual } from "node:crypto";

import { readPaddleConfig } from "@/features/billing/server/config";
import { reconcileBillingBatch } from "@/features/billing/server/billing";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Vercel 外部调度，无需进程内定时器；拒绝未配置或不匹配的凭据，重入使用幂等同步。 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || secret.length < 32 || Buffer.byteLength(authorization) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!readPaddleConfig()) return Response.json({ error: "Billing not configured" }, { status: 503 });
  try {
    const result = await reconcileBillingBatch();
    return Response.json(result, { status: result.failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Reconciliation failed" }, { status: 503 });
  }
}
