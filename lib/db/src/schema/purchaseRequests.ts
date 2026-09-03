import { pgTable, serial, text, numeric, json, timestamp } from "drizzle-orm/pg-core";

export type PurchaseRequestItem = {
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

export type PurchaseRequestStatus = "nueva" | "contactado" | "venta_finalizada" | "cancelada";
export type PurchaseRequestMethod = "whatsapp" | "contra_entrega";

export const purchaseRequestsTable = pgTable("purchase_requests", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  city: text("city"),
  address: text("address"),
  neighborhood: text("neighborhood"),
  addressRef: text("address_ref"),
  items: json("items").$type<PurchaseRequestItem[]>().notNull().default([]),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: text("status").$type<PurchaseRequestStatus>().notNull().default("nueva"),
  contactedAt: timestamp("contacted_at"),
  purchaseMethod: text("purchase_method").$type<PurchaseRequestMethod>().default("whatsapp"),
});
