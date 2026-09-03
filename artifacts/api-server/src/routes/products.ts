import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { db, productsTable, categoriesTable, brandsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  ListRelatedProductsParams,
} from "@workspace/api-zod";
import { extractToken, validateToken } from "../lib/auth";

const router: IRouter = Router();

type ProductRow = Awaited<ReturnType<ReturnType<typeof buildProductSelect>['execute']>>[number];

function serializeProduct(p: ProductRow) {
  return {
    ...p,
    price: Number(p.price),
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
  };
}

function buildProductSelect() {
  return db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brandId: productsTable.brandId,
      brandName: brandsTable.name,
      image: productsTable.image,
      imageUrls: productsTable.imageUrls,
      featured: productsTable.featured,
      visible: productsTable.visible,
      stock: productsTable.stock,
      isOnSale: productsTable.isOnSale,
      originalPrice: productsTable.originalPrice,
      salePrice: productsTable.salePrice,
      aiImageNotice: productsTable.aiImageNotice,
      hasSizes: productsTable.hasSizes,
      sizeTemplate: productsTable.sizeTemplate,
      availableSizes: productsTable.availableSizes,
      shareCount: productsTable.shareCount,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id));
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, brand, search, featured, visible } = parsed.data;

  const conditions = [];

  if (visible !== undefined) {
    conditions.push(eq(productsTable.visible, visible));
  } else {
    const token = extractToken(req.headers.authorization);
    const isAdmin = token ? validateToken(token) : null;
    if (!isAdmin) {
      conditions.push(eq(productsTable.visible, true));
    }
  }

  if (category) {
    conditions.push(eq(categoriesTable.slug, category));
  }

  if (brand) {
    conditions.push(eq(brandsTable.name, brand));
  }

  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }

  if (featured !== undefined) {
    conditions.push(eq(productsTable.featured, featured));
  }

  const query = buildProductSelect().orderBy(desc(productsTable.createdAt));
  const products = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  res.json(products.map(serializeProduct));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await buildProductSelect()
    .where(and(eq(productsTable.featured, true), eq(productsTable.visible, true)))
    .orderBy(desc(productsTable.createdAt))
    .limit(8);

  res.json(products.map(serializeProduct));
});

router.get("/products/new-arrivals", async (_req, res): Promise<void> => {
  const products = await buildProductSelect()
    .where(eq(productsTable.visible, true))
    .orderBy(desc(productsTable.createdAt))
    .limit(8);

  res.json(products.map(serializeProduct));
});

/* Word-overlap score between two product names (higher = more similar) */
function nameOverlap(a: string, b: string): number {
  const stop = new Set(["de", "el", "la", "los", "las", "y", "en", "con", "para", "del"]);
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 1 && !stop.has(w)));
  const wa = words(a);
  const wb = words(b);
  let count = 0;
  wb.forEach(w => { if (wa.has(w)) count++; });
  return count;
}

router.get("/products/:id/related", async (req, res): Promise<void> => {
  const params = ListRelatedProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const NEED = 4;
  const seen = new Set<number>([product.id]);
  const results: ReturnType<typeof serializeProduct>[] = [];

  /* Helper: fetch up to `n` candidates satisfying `cond`, score by name overlap */
  async function fetchTier(cond: SQL<unknown>, n: number) {
    if (results.length >= NEED) return;
    const seenIds = [...seen];
    const rows = await buildProductSelect()
      .where(
        and(
          cond,
          eq(productsTable.visible, true),
          seenIds.length > 0 ? notInArray(productsTable.id, seenIds) : undefined,
        ),
      )
      .orderBy(desc(productsTable.createdAt))
      .limit(n * 3); // fetch extra so we can sort by name overlap

    /* Sort this tier by name overlap (desc), then take what we need */
    const scored = rows
      .map(r => ({ r, score: nameOverlap(product.name, r.name) }))
      .sort((a, b) => b.score - a.score);

    for (const { r } of scored) {
      if (results.length >= NEED) break;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      results.push(serializeProduct(r));
    }
  }

  const sameBrand = sql<boolean>`${productsTable.brandId} = ${product.brandId}`;
  const sameCat   = eq(productsTable.categoryId, product.categoryId);

  /* Tier 1 — same brand + same category */
  if (product.brandId != null) {
    await fetchTier(and(sameBrand, sameCat)!, NEED);
  }

  /* Tier 2 — same brand, any category */
  if (results.length < NEED && product.brandId != null) {
    await fetchTier(sameBrand, NEED);
  }

  /* Tier 3 — same category, any brand */
  if (results.length < NEED) {
    await fetchTier(sameCat, NEED);
  }

  /* Tier 4 — any other visible product */
  if (results.length < NEED) {
    await fetchTier(ne(productsTable.id, product.id), NEED);
  }

  res.json(results);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await buildProductSelect().where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(serializeProduct(product));
});

router.post("/products", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { featured = false, visible = true, stock = 0, brandId, description, isOnSale = false, originalPrice, salePrice, ...rest } = parsed.data;

  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      price: String(rest.price),
      description: description ?? null,
      brandId: brandId ?? null,
      featured,
      visible,
      stock,
      isOnSale,
      originalPrice: originalPrice != null ? String(originalPrice) : null,
      salePrice: salePrice != null ? String(salePrice) : null,
    })
    .returning();

  const [full] = await buildProductSelect().where(eq(productsTable.id, product.id));
  res.status(201).json(serializeProduct(full));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      if (k === "price" || k === "originalPrice" || k === "salePrice") {
        updateData[k] = v != null ? String(v) : null;
      } else {
        updateData[k] = v;
      }
    }
  }

  const [updated] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [full] = await buildProductSelect().where(eq(productsTable.id, updated.id));
  res.json(serializeProduct(full));
});

router.post("/products/:id/duplicate", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [original] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!original) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const { id: _id, createdAt: _createdAt, ...fields } = original;
  const [created] = await db
    .insert(productsTable)
    .values({ ...fields, name: `${original.name} (copia)`, visible: false })
    .returning();

  const [full] = await buildProductSelect().where(eq(productsTable.id, created.id));
  res.status(201).json(serializeProduct(full));
});

/* ── GET /products/top-shared — must be BEFORE /:id to avoid route conflict ─ */
router.get("/products/top-shared", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db
    .select({
      name: productsTable.name,
      shareCount: productsTable.shareCount,
    })
    .from(productsTable)
    .orderBy(desc(productsTable.shareCount))
    .limit(10);

  res.json(rows.filter((r) => r.shareCount > 0));
});

/* ── POST /products/:id/share — increment share counter ─────────────────── */
router.post("/products/:id/share", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db
    .update(productsTable)
    .set({ shareCount: sql`${productsTable.shareCount} + 1` })
    .where(eq(productsTable.id, params.data.id));

  res.json({ ok: true });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
