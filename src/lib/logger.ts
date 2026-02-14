import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const { combine, timestamp, json, errors } = winston.format;

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

if (process.env.NODE_ENV === "production") {
  const logDir = process.env.LOG_DIR ?? path.join(process.cwd(), "logs");
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { service: "emeraude-business" },
  transports,
});

export function withContext(meta: Record<string, unknown>) {
  return logger.child(meta);
}
