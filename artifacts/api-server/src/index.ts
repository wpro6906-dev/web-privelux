import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Fix macOS Safari/Chrome stalled requests on Render:
// Express default keepAliveTimeout (5 s) is less than Render's LB idle timeout (75 s).
// macOS browsers reuse TCP connections aggressively and get stuck on connections
// Express has already closed. Setting both values above the LB timeout resolves it.
server.keepAliveTimeout = 65_000;
server.headersTimeout   = 66_000;
