import { Router, type Request, type Response } from "express";
import { getDomainOrDefault, collectionForDomain } from "../../domains/index.js";
import { retrieve } from "../../core/retrieve.js";
import { rank } from "../../core/rank.js";
import { generateStream } from "../../core/generate.js";
import { createEmbedder } from "../../embed/index.js";
import { query as dbQuery } from "../../db/client.js";

export const chatRouter = Router();

chatRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const { message, domain: domainName = "default", sessionId } = req.body as {
    message?: string;
    domain?: string;
    sessionId?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const domain = getDomainOrDefault(domainName);
    const collection = collectionForDomain(domain);
    const embedder = createEmbedder();

    // Retrieve and rank relevant chunks
    const rawChunks = await retrieve({ query: message, collection, embedder, nResults: 8 });
    const chunks = rank(rawChunks, { domain: domain.name, maxResults: 5 });

    // Persist session + user message
    let sid = sessionId;
    if (!sid) {
      const row = await dbQuery<{ id: string }>(
        "INSERT INTO sessions (domain) VALUES ($1) RETURNING id",
        [domain.name]
      );
      sid = row.rows[0].id;
    }
    await dbQuery(
      "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)",
      [sid, "user", message]
    );

    // Stream response via SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Session-Id", sid);
    res.flushHeaders();

    let fullAnswer = "";
    const systemPrompt = domain.systemPromptAddendum
      ? `${domain.systemPromptAddendum}`
      : undefined;

    for await (const token of generateStream({ query: message, chunks, systemPrompt, domain: domain.name })) {
      fullAnswer += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    // Persist assistant message
    await dbQuery(
      "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)",
      [sid, "assistant", fullAnswer]
    );

    res.write(`data: ${JSON.stringify({ done: true, sessionId: sid })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: String(err) });
    } else {
      res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    }
  }
});
