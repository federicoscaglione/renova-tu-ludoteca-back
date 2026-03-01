import "dotenv/config";
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";
import app from "./app.js";

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "Server listening");
});

process.on("SIGTERM", () => {
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
