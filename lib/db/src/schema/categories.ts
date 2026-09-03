import { pgTable, text, serial, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  image: text("image"),
  iconEmoji: text("icon_emoji"),
  iconImageUrl: text("icon_image_url"),
  section1Title: text("section1_title"),
  section1Image: text("section1_image"),
  section1ProductIds: json("section1_product_ids").$type<number[]>().notNull().default([]),
  section2Title: text("section2_title"),
  section2Image: text("section2_image"),
  section2ProductIds: json("section2_product_ids").$type<number[]>().notNull().default([]),
  tagline: text("tagline"),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
