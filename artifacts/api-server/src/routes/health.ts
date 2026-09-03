import { Router, type IRouter } from "express";

const router: IRouter = Router();

/** Lightweight liveness check — no auth, no DB. */
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
