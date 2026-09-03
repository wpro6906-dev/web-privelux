import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, featuredBrandsTable, brandsTable } from "@workspace/db";
import {
  CreateFeaturedBrandBody,
  UpdateFeaturedBrandParams,
  UpdateFeaturedBrandBody,
  DeleteFeaturedBrandParams,
} from "@workspace/api-zod";
import { extractToken, validateToken } from "../lib/auth";

const router: IRouter = Router();

async function enrichedList(activeOnly: boolean) {
  const rows = await db
    .select({
      id: featuredBrandsTable.id,
      brandId: featuredBrandsTable.brandId,
      brandName: brandsTable.name,
      imageUrl: featuredBrandsTable.imageUrl,
      imageMobileUrl: featuredBrandsTable.imageMobileUrl,
      order: featuredBrandsTable.order,
      active: featuredBrandsTable.active,
    })
    .from(featuredBrandsTable)
    .innerJoin(brandsTable, eq(featuredBrandsTable.brandId, brandsTable.id))
    .orderBy(asc(featuredBrandsTable.order));

  return activeOnly ? rows.filter((r) => r.active && r.imageUrl) : rows;
}

/* Public — active only */
router.get("/featured-brands", async (_req, res) => {
  const rows = await enrichedList(true);
  res.json(rows);
});

/* Admin — all */
router.get("/featured-brands/all", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await enrichedList(false);
  res.json(rows);
});

/* Create */
router.post("/featured-brands", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateFeaturedBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const { brandId, imageUrl, imageMobileUrl, order, active } = parsed.data;
  const [created] = await db
    .insert(featuredBrandsTable)
    .values({ brandId, imageUrl, imageMobileUrl: imageMobileUrl ?? null, order: order ?? 0, active: active ?? true })
    .returning();

  const all = await enrichedList(false);
  const enriched = all.find((r) => r.id === created.id);
  res.status(201).json(enriched);
});

/* Update */
router.patch("/featured-brands/:id", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const paramsParsed = UpdateFeaturedBrandParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error });
    return;
  }

  const bodyParsed = UpdateFeaturedBrandBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error });
    return;
  }

  const existing = await db
    .select()
    .from(featuredBrandsTable)
    .where(eq(featuredBrandsTable.id, paramsParsed.data.id));

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updates: Partial<typeof featuredBrandsTable.$inferInsert> = {};
  const { brandId, imageUrl, imageMobileUrl, order, active } = bodyParsed.data;
  if (brandId !== undefined) updates.brandId = brandId;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (imageMobileUrl !== undefined) updates.imageMobileUrl = imageMobileUrl;
  if (order !== undefined) updates.order = order;
  if (active !== undefined) updates.active = active;

  await db
    .update(featuredBrandsTable)
    .set(updates)
    .where(eq(featuredBrandsTable.id, paramsParsed.data.id));

  const all = await enrichedList(false);
  const enriched = all.find((r) => r.id === paramsParsed.data.id);
  res.json(enriched);
});

/* Delete */
router.delete("/featured-brands/:id", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = DeleteFeaturedBrandParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  await db.delete(featuredBrandsTable).where(eq(featuredBrandsTable.id, parsed.data.id));
  res.status(204).end();
});

export default router;
