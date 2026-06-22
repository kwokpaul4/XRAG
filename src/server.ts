import "dotenv/config";
import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chatRouter } from "./api/routes/chat.js";
import { sourcesRouter } from "./api/routes/sources.js";
import { domainsRouter } from "./api/routes/domains.js";
import { config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  // API routes
  app.use("/api/chat", chatRouter);
  app.use("/api/sources", sourcesRouter);
  app.use("/api/domains", domainsRouter);

  // Serve web UI
  app.use(express.static(join(__dirname, "web")));
  app.get("*", (_req, res) => {
    res.sendFile(join(__dirname, "web", "index.html"));
  });

  return app;
}

// Only start when run directly
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`XRAG server running at http://localhost:${config.port}`);
    console.log(`Domains: http://localhost:${config.port}/api/domains`);
  });
}
