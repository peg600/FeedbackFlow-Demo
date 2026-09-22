import { businessError } from "@/lib/errors";
import { readPaddleConfig } from "@/lib/paddle-config";
import { db } from "@/server/db";
import { getPaddle } from "@/server/paddle";
import { processPaddleEvent } from "@/server/services/billing-sync";

export const runtime = "nodejs";

/** 验证原始请求及签名时间后原子处理事件；任何失败均非 2xx，让 Paddle 可安全重试。 */
export async function POST(request: Request) {
  const config = readPaddleConfig();
  if (!config) return Response.json({ error: businessError("BILLING_NOT_CONFIGURED").toPayload() }, { status: 503 });
  try {
    const signature = request.headers.get("paddle-signature") ?? "";
    const timestamp = signature.split(";").map((part) => part.trim()).find((part) => part.startsWith("ts="))?.slice(3);
    // SDK 仅拒绝过旧签名；同时限制未来时间，保持重放窗口双向有界。
    if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 5) throw new Error("Invalid signature timestamp");
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 1_000_000) throw new Error("Invalid body");
    const event = await getPaddle().webhooks.unmarshal(rawBody, config.webhookSecret, signature);
    const outcome = await processPaddleEvent(db, event, config.priceId);
    console.info("Paddle webhook processed", { eventId: event.eventId, eventType: event.eventType, outcome });
    return Response.json({ received: true });
  } catch {
    const error = businessError("BILLING_UNAVAILABLE");
    console.error("Paddle webhook failed", { requestId: error.requestId });
    return Response.json({ error: error.toPayload() }, { status: 503 });
  }
}
