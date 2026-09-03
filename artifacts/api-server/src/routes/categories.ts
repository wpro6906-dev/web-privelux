import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, productsTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { extractToken, validateToken } from "../lib/auth";

const router: IRouter = Router();

async function getCategoriesWithCounts() {
  const cats = await db.select().from(categoriesTable);
  const counts = await db
    .select({
      categoryId: productsTable.categoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(productsTable)
    .groupBy(productsTable.categoryId);

  const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));
  return cats.map((c) => ({ ...c, productCount: countMap.get(c.id) ?? 0 }));
}

async function getCategoryWithCount(id: number) {
  const [cat] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id));
  if (!cat) return null;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.categoryId, id));

  return { ...cat, productCount: row?.count ?? 0 };
}

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await getCategoriesWithCounts();
  res.json(categories);
});

router.post("/categories", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [category] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json({ ...category, productCount: 0 });
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updateData[k] = v;
  }

  const [updated] = await db
    .update(categoriesTable)
    .set(updateData)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const cat = await getCategoryWithCount(updated.id);
  res.json(cat);
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
