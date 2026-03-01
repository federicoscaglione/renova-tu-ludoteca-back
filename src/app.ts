import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { config } from "./config/index";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes/index";
import { openApiSpec, openApiUi, openApiUiSetup } from "./openapi/spec";

const app = express();

const isDev = config.nodeEnv !== "production";
app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    ...(isDev && {
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  })
);

app.use(
  cors({
    origin: [...config.cors.origins],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
