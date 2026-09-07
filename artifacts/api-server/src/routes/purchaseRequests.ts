import { Router, type IRouter } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { db, purchaseRequestsTable, productsTable, brandsTable, categoriesTable } from "@workspace/db";
import { extractToken, validateToken } from "../lib/auth";
import {
  CreatePurchaseRequestBody,
  UpdatePurchaseRequestParams,
  UpdatePurchaseRequestBody,
  DeletePurchaseRequestParams,
} from "@workspace/api-zod";
const router: IRouter = Router();

async function sendNewRequestEmail(data: {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  items: Array<{ name?: string; quantity?: number; price?: number; size?: string }>;
  total: number;
  createdAt: Date;
  purchaseMethod?: string | null;
  city?: string | null;
  address?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set – email notification skipped");
    return;
  }

  const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;
  const localDate = new Date(data.createdAt.getTime() + BOGOTA_OFFSET_MS);
  const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const dateStr = `${localDate.getUTCDate()} de ${MONTHS_ES[localDate.getUTCMonth()]} de ${localDate.getUTCFullYear()}`;
  const timeStr = `${String(localDate.getUTCHours()).padStart(2,"0")}:${String(localDate.getUTCMinutes()).padStart(2,"0")}`;
  const totalFmt = data.total.toLocaleString("es-CO");
  const isContraEntrega = data.purchaseMethod === "contra_entrega";
  const methodLabel = isContraEntrega ? "📦 Contra entrega" : "💬 WhatsApp";
  const methodColor = isContraEntrega ? "#d97706" : "#22c55e";

  const DASHBOARD_URL =
    process.env.DASHBOARD_URL ??
    `${(process.env.FRONTEND_URL ?? "https://priveluxstore.vercel.app").split(",")[0].replace(/\/+$/, "")}/admin`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#888;font-size:12px;border-bottom:1px solid #1e1e1e;white-space:nowrap;padding-right:24px;">${label}</td><td style="padding:8px 0;color:#fff;font-size:13px;border-bottom:1px solid #1e1e1e;">${value}</td></tr>`;

  const addressBlock = isContraEntrega && (data.city || data.address)
    ? `<div style="background:#111;border:1px solid #2a2000;border-left:3px solid ${methodColor};padding:14px 16px;margin:20px 0;border-radius:2px;">
        <p style="color:#888;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 10px;">Dirección de entrega</p>
        ${data.city ? `<p style="color:#fff;font-size:13px;margin:4px 0;"><strong style="color:#888;font-size:11px;">Ciudad:</strong> ${data.city}</p>` : ""}
        ${data.address ? `<p style="color:#fff;font-size:13px;margin:4px 0;"><strong style="color:#888;font-size:11px;">Dirección:</strong> ${data.address}</p>` : ""}
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:32px 20px;">

  <!-- Header -->
  <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid #1e1e1e;margin-bottom:24px;">
    <h1 style="color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:700;margin:0;text-transform:uppercase;">PRIVELUX</h1>
    <p style="color:#666;font-size:11px;letter-spacing:0.15em;margin:6px 0 0;text-transform:uppercase;">Nueva solicitud de compra</p>
  </div>

  <!-- Badge -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    <span style="background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;font-size:13px;font-weight:700;padding:6px 14px;letter-spacing:0.05em;">Solicitud #${data.id}</span>
    <span style="background:#1a1a1a;border:1px solid ${methodColor}40;color:${methodColor};font-size:11px;padding:6px 12px;letter-spacing:0.08em;text-transform:uppercase;">${methodLabel}</span>
  </div>

  <!-- Info table -->
  <div style="background:#111;border:1px solid #1e1e1e;padding:16px 20px;margin-bottom:4px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row("Cliente", data.name)}
      ${row("Teléfono", data.phone)}
      ${data.email ? row("Correo", data.email) : ""}
      ${row("Productos", `${data.items.length} artículo${data.items.length !== 1 ? "s" : ""}`)}
      ${row("Total estimado", `$${totalFmt} COP`)}
      ${row("Fecha", `${dateStr} · ${timeStr}`)}
      ${row("Estado", "🟡 Nueva")}
    </table>
  </div>

  ${addressBlock}

  <!-- CTA button -->
  <div style="text-align:center;margin:32px 0 24px;">
    <a href="${DASHBOARD_URL}"
       style="display:inline-block;background:#c9a84c;color:#000;text-decoration:none;padding:16px 40px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;border-radius:1px;">
      Ver en Dashboard →
    </a>
    <p style="color:#444;font-size:11px;margin:12px 0 0;">
      <a href="${DASHBOARD_URL}" style="color:#666;text-decoration:underline;">${DASHBOARD_URL}</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1e1e1e;padding-top:16px;text-align:center;">
    <p style="color:#444;font-size:10px;letter-spacing:0.1em;margin:0;">PRIVELUX · Panel de administración</p>
  </div>

</div>
</body>
</html>`;

  const text = [
    `Nueva solicitud #${data.id} — PRIVELUX`,
    `Método: ${methodLabel}`,
    "",
    `Cliente: ${data.name}`,
    `Teléfono: ${data.phone}`,
    ...(data.email ? [`Correo: ${data.email}`] : []),
    `Productos: ${data.itemCount}`,
    `Total estimado: $${totalFmt} COP`,
    `Fecha: ${dateStr} · ${timeStr}`,
    "Estado: Nueva",
    ...(data.city ? [`Ciudad: ${data.city}`] : []),
    ...(data.address ? [`Dirección: ${data.address}`] : []),
    "",
    `Ver en Dashboard: ${DASHBOARD_URL}`,
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "PRIVELUX <onboarding@resend.dev>",
      to: ["ventas.privelux@gmail.com"],
      subject: `🛍 Nueva solicitud #${data.id} — ${data.name} (${isContraEntrega ? "Contra entrega" : "WhatsApp"})`,
      html,
      text,
    }),
  });
}

router.post("/purchase-requests", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db
    .insert(purchaseRequestsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(record);

  // Fire-and-forget email — no await so it doesn't block the response
  const emailItems = parsed.data.items as Array<{ name?: string; price?: number; quantity?: number; size?: string }>;
  const total = emailItems.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
  sendNewRequestEmail({
    id: record.id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    items: emailItems,
    total,
    createdAt: record.createdAt,
    purchaseMethod: parsed.data.purchaseMethod,
    city: parsed.data.city,
    address: parsed.data.address,
  }).catch(() => {});
});

router.get("/purchase-requests/stats", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { days, from, to } = req.query as { days?: string; from?: string; to?: string };

  // America/Bogota = UTC-5, no DST
  const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Returns "YYYY-MM-DD" in Bogotá local time for any UTC Date
  function bogotaDateKey(d: Date): string {
    return new Date(d.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
  }

  // Returns the UTC Date that corresponds to 00:00:00 Bogotá on the given date key
  // midnight Bogotá (UTC-5) = 05:00 UTC
  function bogotaDayStart(key: string): Date {
    return new Date(`${key}T05:00:00.000Z`);
  }

  let dateFrom: Date;
  let dateTo: Date;

  if (from && to) {
    dateFrom = bogotaDayStart(from as string);
    // end of `to` day in Bogotá = start of next Bogotá day - 1ms
    dateTo = new Date(bogotaDayStart(to as string).getTime() + DAY_MS - 1);
  } else {
    const d = days ? parseInt(days, 10) : 30;
    const todayKey = bogotaDateKey(new Date());
    const todayStart = bogotaDayStart(todayKey);
    dateTo = new Date(todayStart.getTime() + DAY_MS - 1);
    dateFrom = new Date(todayStart.getTime() - (d - 1) * DAY_MS);
  }

  const all = await db.select().from(purchaseRequestsTable);

  const inRange = all.filter((r) => {
    const t = new Date(r.createdAt);
    return t >= dateFrom && t <= dateTo;
  });

  const inRangeVentas = inRange.filter((r) => r.status === "venta_finalizada");
  const summary = {
    total: all.length,
    nueva: all.filter((r) => r.status === "nueva").length,
    contactado: all.filter((r) => r.status === "contactado").length,
    venta_finalizada: all.filter((r) => r.status === "venta_finalizada").length,
    cancelada: all.filter((r) => r.status === "cancelada").length,
    conversionRate: all.length
      ? Math.round((all.filter((r) => r.status === "venta_finalizada").length / all.length) * 1000) / 10
      : 0,
    ingresoTotal: inRangeVentas.reduce((s, r) => s + Number(r.total ?? 0), 0),
  };

  // byDay — iterate in Bogotá days, key by Bogotá date
  const dayMap: Record<string, number> = {};
  const fromKey = bogotaDateKey(dateFrom);
  const toKey   = bogotaDateKey(dateTo);
  let cur = bogotaDayStart(fromKey);
  while (bogotaDateKey(cur) <= toKey) {
    dayMap[bogotaDateKey(cur)] = 0;
    cur = new Date(cur.getTime() + DAY_MS);
  }
  for (const r of inRange) {
    const key = bogotaDateKey(new Date(r.createdAt));
    if (key in dayMap) dayMap[key]++;
  }
  const byDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  // byDayVentas — same range, only venta_finalizada records
  const ventasMap: Record<string, number> = Object.fromEntries(Object.keys(dayMap).map((k) => [k, 0]));
  for (const r of inRange) {
    if (r.status !== "venta_finalizada") continue;
    const key = bogotaDateKey(new Date(r.createdAt));
    if (key in ventasMap) ventasMap[key]++;
  }
  const byDayVentas = Object.entries(ventasMap).map(([date, count]) => ({ date, count }));

  // byDayContactados — same range, only requests whose current status is contactado
  const contactadosMap: Record<string, number> = Object.fromEntries(Object.keys(dayMap).map((k) => [k, 0]));
  for (const r of inRange) {
    if (r.status !== "contactado") continue;
    const key = bogotaDateKey(new Date(r.createdAt));
    if (key in contactadosMap) contactadosMap[key]++;
  }
  const byDayContactados = Object.entries(contactadosMap).map(([date, count]) => ({ date, count }));

  // byDayCanceladas
  const canceladasMap: Record<string, number> = Object.fromEntries(Object.keys(dayMap).map((k) => [k, 0]));
  for (const r of inRange) {
    if (r.status !== "cancelada") continue;
    const key = bogotaDateKey(new Date(r.createdAt));
    if (key in canceladasMap) canceladasMap[key]++;
  }
  const byDayCanceladas = Object.entries(canceladasMap).map(([date, count]) => ({ date, count }));

  // byDayRevenue — sum of total (COP) for venta_finalizada per day
  const revenueMap: Record<string, number> = Object.fromEntries(Object.keys(dayMap).map((k) => [k, 0]));
  for (const r of inRange) {
    if (r.status !== "venta_finalizada") continue;
    const key = bogotaDateKey(new Date(r.createdAt));
    if (key in revenueMap) revenueMap[key] += Number(r.total ?? 0);
  }
  const byDayRevenue = Object.entries(revenueMap).map(([date, revenue]) => ({ date, revenue }));

  // Aggregate items for products/brands/categories
  // Items only store productId+name — resolve brand/category via DB lookup
  type RawItem = { productId?: number; name?: string; brandName?: string; categoryName?: string; quantity?: number };

  const allItems = all.flatMap((r) => r.items as RawItem[]);

  // Collect all productIds that don't already have brand/category embedded
  const productIds = [...new Set(
    allItems.map((i) => i.productId).filter((id): id is number => typeof id === "number"),
  )];

  // Fetch product→brand/category mapping in one query
  const productMeta: Record<number, { brand: string; category: string }> = {};
  if (productIds.length > 0) {
    const rows = await db
      .select({
        id:       productsTable.id,
        brand:    brandsTable.name,
        category: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(brandsTable,    eq(productsTable.brandId,    brandsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(inArray(productsTable.id, productIds));

    for (const row of rows) {
      productMeta[row.id] = { brand: row.brand ?? "", category: row.category ?? "" };
    }
  }

  const productMap: Record<string, number> = {};
  const brandMap: Record<string, number> = {};
  const categoryMap: Record<string, number> = {};

  for (const item of allItems) {
    const qty = item.quantity ?? 1;
    const name     = item.name ?? "";
    const meta     = item.productId ? productMeta[item.productId] : null;
    const brand    = item.brandName    ?? meta?.brand    ?? "";
    const category = item.categoryName ?? meta?.category ?? "";

    if (name)     productMap[name]     = (productMap[name]     ?? 0) + qty;
    if (brand)    brandMap[brand]      = (brandMap[brand]      ?? 0) + qty;
    if (category) categoryMap[category] = (categoryMap[category] ?? 0) + qty;
  }

  const rank = (map: Record<string, number>) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

  // Top clients by phone
  const clientMap: Record<string, { name: string; count: number }> = {};
  for (const r of all) {
    if (!clientMap[r.phone]) clientMap[r.phone] = { name: r.name, count: 0 };
    clientMap[r.phone].count++;
  }
  const topClients = Object.entries(clientMap)
    .filter(([, { count }]) => count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([phone, { name, count }]) => ({ name, phone, count }));

  res.json({
    summary,
    byDay,
    byDayVentas,
    byDayContactados,
    byDayCanceladas,
    byDayRevenue,
    topProducts: rank(productMap),
    topBrands: rank(brandMap),
    topCategories: rank(categoryMap),
    topClients,
  });
});

router.post("/purchase-requests/reset-sequence", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseRequestsTable);

  if (count > 0) {
    res.status(409).json({ error: "La tabla no está vacía. Elimina todas las solicitudes primero." });
    return;
  }

  await db.execute(sql`ALTER SEQUENCE purchase_requests_id_seq RESTART WITH 1`);
  res.json({ message: "Contador reiniciado a 1." });
});

router.get("/purchase-requests", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const records = await db
    .select()
    .from(purchaseRequestsTable)
    .orderBy(purchaseRequestsTable.createdAt);

  res.json(records.reverse());
});

router.patch("/purchase-requests/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdatePurchaseRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePurchaseRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(purchaseRequestsTable)
    .set(parsed.data)
    .where(eq(purchaseRequestsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(updated);
});

router.delete("/purchase-requests/:id", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdatePurchaseRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(purchaseRequestsTable)
    .where(eq(purchaseRequestsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(204).send();
});

export default router;
