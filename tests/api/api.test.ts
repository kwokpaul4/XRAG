import { describe, it, expect, afterAll } from "vitest";
import http from "node:http";
import { createApp } from "../../src/server.js";
import { closePool } from "../../src/db/client.js";

let server: http.Server;
let baseUrl: string;

async function setup() {
  const app = createApp();
  await new Promise<void>((res) => {
    server = app.listen(0, () => res());
  });
  const port = (server.address() as { port: number }).port;
  baseUrl = `http://localhost:${port}`;
}

async function get(path: string) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let data = "";
      res.on("data", (c: string) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode ?? 0, body: data }); }
      });
    }).on("error", reject);
  });
}

async function post(path: string, body: unknown) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    }, (res) => {
      let data = "";
      res.on("data", (c: string) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode ?? 0, body: data }); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// Set up once before all tests
await setup();

afterAll(async () => {
  await new Promise<void>((res) => server.close(() => res()));
  await closePool();
});

describe("api/health", () => {
  it("GET /health returns ok", async () => {
    const { status, body } = await get("/health");
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe("ok");
  });
});

describe("api/domains", () => {
  it("GET /api/domains returns list of domains", async () => {
    const { status, body } = await get("/api/domains");
    expect(status).toBe(200);
    const domains = body as { name: string; displayName: string }[];
    expect(Array.isArray(domains)).toBe(true);
    expect(domains.some((d) => d.name === "default")).toBe(true);
    expect(domains.some((d) => d.name === "medicine")).toBe(true);
  });
});

describe("api/sources", () => {
  it("GET /api/sources returns array", async () => {
    const { status, body } = await get("/api/sources");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /api/sources/:id returns 404 for unknown id", async () => {
    const { status } = await get("/api/sources/00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });

  it("DELETE /api/sources/:id returns 204 for unknown id", async () => {
    const result = await new Promise<number>((resolve, reject) => {
      const req = http.request(`${baseUrl}/api/sources/00000000-0000-0000-0000-000000000000`, {
        method: "DELETE",
      }, (res) => resolve(res.statusCode ?? 0));
      req.on("error", reject);
      req.end();
    });
    expect(result).toBe(204);
  });
});

describe("api/chat validation", () => {
  it("POST /api/chat without message returns 400", async () => {
    const { status, body } = await post("/api/chat", { domain: "default" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toContain("message");
  });
});
