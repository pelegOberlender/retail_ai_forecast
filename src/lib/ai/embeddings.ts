/**
 * Phase 2 similarity signal: embeddings via Voyage AI (Anthropic's recommended
 * embeddings partner — Anthropic does not offer a first-party embeddings
 * endpoint). Dormant until VOYAGE_API_KEY is set; callers should fall back to
 * token-overlap similarity when this returns null.
 *
 * Verify against https://docs.voyageai.com/docs/embeddings before relying on
 * this in production — the shape below is Voyage's documented REST API as of
 * this writing, not something Anthropic's docs cover.
 */

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-lite";

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
};

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey || texts.length === 0) return null;

  try {
    const res = await fetch(VOYAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as VoyageResponse;
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
