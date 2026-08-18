import {
  index,
  pgTable,
  text,
  timestamp,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

import { feedback } from "./feedback";
import { user } from "./auth";

// Votes store only the voting relationship; project data is reached through feedback.
export const votes = pgTable(
  "votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "restrict",
      }),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, {
        onDelete: "cascade",
      }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.feedbackId],
    }),
    index("votes_feedback_idx").on(table.feedbackId),
  ],
);
