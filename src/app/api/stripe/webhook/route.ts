import { businessError } from "@/lib/errors";

export async function POST() {
  return Response.json(
    { error: businessError("BILLING_NOT_IMPLEMENTED").toPayload() },
    { status: 501 },
  );
}
