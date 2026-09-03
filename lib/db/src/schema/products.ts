import { pgTable, text, serial, boolean, integer, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { brandsTable } from "./brands";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  brandId: integer("brand_id").references(() => brandsTable.id),
  image: text("image").notNull(),
  imageUrls: json("image_urls").$type<string[]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  visible: boolean("visible").notNull().default(true),
  stock: integer("stock").notNull().default(0),
  isOnSale: boolean("is_on_sale").notNull().default(false),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  aiImageNotice: boolean("ai_image_notice").notNull().default(false),
  hasSizes: boolean("has_sizes").notNull().default(false),
  sizeTemplate: text("size_template"),
  availableSizes: json("available_sizes").$type<string[]>().notNull().default([]),
  shareCount: integer("share_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
