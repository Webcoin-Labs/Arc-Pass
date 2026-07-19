import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { uploadsStaticDir, uploadsPublicPathPrefix } from "./lib/uploads";
import { configuration } from "./lib/env";
import { fingerprintRateLimitKey, reserveRateLimit, setRateLimitHeaders } from "./lib/rate-limit";

const app: Express = express();
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://rpc.testnet.arc.io https://rpc.testnet.arc.network https://*.arc.io https://*.arc.network https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.com https://*.web3modal.org wss://*.walletconnect.com wss://*.walletconnect.org",
  "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.com",
  "form-action 'self' https://x.com https://discord.com https://github.com",
  "worker-src 'self' blob:",
].join("; ");

// Railway terminates TLS at a single trusted reverse proxy. Trusting that hop
// makes req.ip useful for public abuse protection without trusting arbitrary
// client-supplied forwarding headers in local development.
if (configuration.isProduction) app.set("trust proxy", 1);

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
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
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
  limit: "256kb",
  verify(req, _res, buffer) {
    (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: "64kb", parameterLimit: 100 }));
app.use(cookieParser());

app.use(uploadsPublicPathPrefix, express.static(uploadsStaticDir));
app.use("/api", async (req, res, next) => {
  if (req.path === "/healthz") {
    next();
    return;
  }
  try {
    const decision = await reserveRateLimit(fingerprintRateLimitKey("api", req.ip || "unknown"), 120, 60_000);
    setRateLimitHeaders(res, decision);
    if (!decision.allowed) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((decision.resetAt.getTime() - Date.now()) / 1_000))));
      res.status(429).json({ error: "Too many requests. Try again shortly." });
      return;
    }
    next();
  } catch (error) {
    req.log.warn({ errorName: error instanceof Error ? error.name : "unknown" }, "Central rate limiter unavailable");
    next();
  }
});
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
