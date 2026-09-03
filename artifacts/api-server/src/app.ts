import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server tools and same-origin requests can have no Origin header.
      if (!origin || allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      callback(null, allowedOrigins.includes(normalizedOrigin));
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local assets. ASSETS_DIR env var overrides the default relative path.
const assetsDir = process.env.ASSETS_DIR ?? path.resolve(__dirname, "../../../attached_assets");
app.use("/api/assets", express.static(assetsDir));
app.use("/api", router);

export default app;
