import cors from "cors";
import express from "express";
import { env } from "@/config/env";
import { STORAGE_PUBLIC_DIR } from "@/config/localStore";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { requestLogger } from "@/middleware/requestLogger";
import { apiRouter } from "@/routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  // Serves uploaded ticket files locally — the local-store equivalent of a Storage signed-URL read.
  app.use("/storage", express.static(STORAGE_PUBLIC_DIR));

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
