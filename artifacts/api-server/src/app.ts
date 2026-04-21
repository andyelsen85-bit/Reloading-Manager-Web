import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const PgStore = connectPg(session);

app.use(session({
  store: new PgStore({
    conString: process.env["DATABASE_URL"],
    tableName: "session",
    createTableIfMissing: false,
  }),
  secret: process.env["SESSION_SECRET"] ?? "reloading-manager-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

app.use("/api", router);

app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "API request failed");
  res.status(err?.statusCode ?? err?.status ?? 500).json({
    error: err?.message ?? "Internal Server Error",
  });
});

if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(import.meta.dirname, "public");
  app.use(express.static(staticDir));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
