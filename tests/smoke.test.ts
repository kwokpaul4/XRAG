import { describe, it, expect } from "vitest";

/**
 * Smoke test — Phase 1 baseline.
 * Verifies the project wires together and the health endpoint responds.
 */

describe("smoke", () => {
  it("imports config without throwing", async () => {
    const { config } = await import("../src/config.js");
    expect(config).toBeDefined();
    expect(config.port).toBeGreaterThan(0);
  });

  it("shared types are importable", async () => {
    const types = await import("../src/types.js");
    // Just ensure the module loads — types don't have runtime values
    expect(types).toBeDefined();
  });

  it("createApp returns an express app with /health", async () => {
    const { createApp } = await import("../src/server.js");
    const app = createApp();

    // Use supertest-style raw request via node:http to avoid a supertest dep
    await new Promise<void>((resolve, reject) => {
      const server = app.listen(0, () => {
        const port = (server.address() as { port: number }).port;
        import("node:http").then(({ default: http }) => {
          http.get(`http://localhost:${port}/health`, (res) => {
            let data = "";
            res.on("data", (chunk: string) => (data += chunk));
            res.on("end", () => {
              try {
                const body = JSON.parse(data) as { status: string };
                expect(res.statusCode).toBe(200);
                expect(body.status).toBe("ok");
                server.close(() => resolve());
              } catch (err) {
                server.close(() => reject(err));
              }
            });
          }).on("error", (err) => server.close(() => reject(err)));
        }).catch(reject);
      });
    });
  });
});
