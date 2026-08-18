import {
  boolean,
  pgTable,
  text,
  index,
  uuid,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { projects } from "./projects";

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "under_review",
  "planned",
  "in_progress",
  "completed",
]);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(true),
    status: feedbackStatusEnum("status").default("under_review").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feedback_project_status_idx").on(table.projectId, table.status),
    index("feedback_project_created_idx").on(table.projectId, table.createdAt),
  ],
);
