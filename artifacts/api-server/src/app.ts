import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { uploadsStaticDir, uploadsPublicPathPrefix } from "./lib/uploads";
import { configuration } from "./lib/env";

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

app.use(cors({
  origin: configuration.appUrl,
  credentials: true,
}));
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (configuration.isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }
  const requestOrigin = req.get("origin") || req.get("referer");
  if (!requestOrigin) {
    next();
    return;
  }
  let allowedOrigin: string;
  let suppliedOrigin: string;
  try {
    allowedOrigin = new URL(configuration.appUrl).origin;
    suppliedOrigin = new URL(requestOrigin).origin;
  } catch {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }
  if (suppliedOrigin !== allowedOrigin) {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }
  next();
});
app.use(express.json({
  verify(req, _res, buffer) {
    (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(uploadsPublicPathPrefix, express.static(uploadsStaticDir));
app.use("/api", router);

const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  req.log.error({ err }, "Unhandled API error");
  const status = typeof err === "object" && err && "status" in err && typeof err.status === "number" && err.status >= 400 && err.status < 500
    ? err.status
    : 500;
  res.status(status).json({
    error: status === 400 ? "The request body is invalid." : "The service is temporarily unavailable. Please try again.",
  });
};
app.use(jsonErrorHandler);

export default app;
