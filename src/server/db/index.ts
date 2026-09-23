import { drizzle } from "drizzle-orm/neon-serverless";

import { env } from "@/server/env";
import * as schema from "@/server/db/schema";

export const db = drizzle(env.DATABASE_URL, { schema });
