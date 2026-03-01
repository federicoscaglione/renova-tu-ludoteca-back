import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";
import { openApiSpec, openApiUi, openApiUiSetup } from "./openapi/spec.js";

const app = express();

app.use(
  pinoHttp({ logger, autoLogging: true })
);

app.use(
  cors({
    origin: [...config.cors.origins],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/api-docs.json", (_req, res) => {
  res.json(openApiSpec);
});
app.use("/api-docs", openApiUi, openApiUiSetup);

app.use("/api", routes);

app.use(errorHandler);

export default app;
