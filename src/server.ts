import "dotenv/config";
import { config } from "./config/index";
import { logger } from "./lib/logger";
import { warmJwksCache } from "./middleware/auth";
import { startScheduler } from "./jobs/scheduler";
import app from "./app";

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "Server listening");
  warmJwksCache();
  startScheduler();
});

process.on("SIGTERM", () => {
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
