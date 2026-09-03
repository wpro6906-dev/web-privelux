import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { brandsTable } from "./brands";

export const featuredBrandsTable = pgTable("featured_brands", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id")
    .notNull()
    .references(() => brandsTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  imageMobileUrl: text("image_mobile_url"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const insertFeaturedBrandSchema = createInsertSchema(featuredBrandsTable).omit({
  id: true,
});
export type InsertFeaturedBrand = z.infer<typeof insertFeaturedBrandSchema>;
export type FeaturedBrandRow = typeof featuredBrandsTable.$inferSelect;
