import {
  boolean,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(true),
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
    uniqueIndex("projects_user_id_unique").on(table.userId),
    uniqueIndex("projects_slug_unique").on(table.slug),
  ],
);
