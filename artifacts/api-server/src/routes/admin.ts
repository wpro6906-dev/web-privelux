import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash,
  createToken,
  validateToken,
  extractToken,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username));

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Upgrade legacy hashes in-place without changing the existing database schema.
  if (isLegacyPasswordHash(admin.passwordHash)) {
    await db
      .update(adminUsersTable)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(adminUsersTable.id, admin.id));
  }

  const token = createToken(username);
  res.json({ success: true, token });
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const username = validateToken(token);
  if (!username) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({ username });
});

router.post("/admin/cloudinary-signature", async (req, res): Promise<void> => {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({ error: "Cloudinary is not configured" });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "privelux/products";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  res.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  });
});

export default router;
