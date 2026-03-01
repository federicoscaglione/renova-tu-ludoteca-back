import "dotenv/config";
import pino from "pino";
import pinoPretty from "pino-pretty";

const usePretty = process.env.NODE_ENV !== "production";

let stream: NodeJS.WritableStream = process.stdout;
if (usePretty) {
  stream = pinoPretty({
    destination: 1, // stdout directo (evita duplicados por pipe)
    colorize: true,
    translateTime: "SYS:HH:MM:ss",
    ignore: "pid,hostname",
    singleLine: true,
    customPrettifiers: {
      req: (input: string | object) =>
        typeof input === "object" && input !== null && "method" in input && "url" in input
          ? `${(input as { method: string }).method} ${(input as { url: string }).url}`
          : "",
      res: (input: string | object) =>
        typeof input === "object" && input !== null && "statusCode" in input
          ? String((input as { statusCode: number }).statusCode)
          : "",
    },
  });
}

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
  },
  stream
);
