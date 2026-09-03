import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import {
  CreateBrandBody,
  UpdateBrandParams,
  UpdateBrandBody,
  DeleteBrandParams,
} from "@workspace/api-zod";
import { extractToken, validateToken } from "../lib/auth";

const router: IRouter = Router();

router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db.select().from(brandsTable);
  res.json(brands);
});

router.post("/brands", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [brand] = await db.insert(brandsTable).values(parsed.data).returning();
  res.status(201).json(brand);
});

router.patch("/brands/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updateData[k] = v;
  }

  const [updated] = await db
    .update(brandsTable)
    .set(updateData)
    .where(eq(brandsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(updated);
});

router.delete("/brands/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(brandsTable)
    .where(eq(brandsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
