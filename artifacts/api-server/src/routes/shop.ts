import { Router, type IRouter } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/shop/summary", async (_req, res): Promise<void> => {
  const [totalResult] = await db
    .select({ count: count() })
    .from(productsTable)
    .where(eq(productsTable.visible, true));

  const [catResult] = await db
    .select({ count: count() })
    .from(categoriesTable);

  const categoryCounts = await db
    .select({
      categoryName: categoriesTable.name,
      count: sql<number>`count(${productsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(
      productsTable,
      eq(categoriesTable.id, productsTable.categoryId)
    )
    .groupBy(categoriesTable.name);

  res.json({
    totalProducts: totalResult?.count ?? 0,
    totalCategories: catResult?.count ?? 0,
    categoryCounts,
  });
});

export default router;
