import type { RetrievedChunk } from "../types.js";

/**
 * Re-rank retrieved chunks by boosting domain match and penalising
 * very short content. Score is a weighted blend of similarity + heuristics.
 */
export function rank(
  chunks: RetrievedChunk[],
  opts: { domain?: string; maxResults?: number } = {}
): RetrievedChunk[] {
  const scored = chunks.map((chunk) => {
    let score = chunk.score;

    // Boost chunks that match the requested domain
    if (opts.domain && chunk.document.metadata.domain === opts.domain) {
      score *= 1.1;
    }

    // Penalise very short chunks (< 50 chars) — likely noise
    if (chunk.document.content.length < 50) {
      score *= 0.7;
    }

    return { ...chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxResults ?? 5);
}
