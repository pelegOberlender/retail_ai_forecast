import Anthropic from "@anthropic-ai/sdk";

/**
 * Phase 2 trend signal: a Claude agent with the web search tool, researching
 * live demand/trend momentum for a brand + category ahead of a target
 * quarter. Dormant until ANTHROPIC_API_KEY is set — callers should fall back
 * to a deterministic heuristic when this returns null (missing key, parse
 * failure, refusal, or any API error).
 */

export type TrendResult = {
  score: number; // 0-100
  rationale: string;
};

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function parseTrendJson(text: string): TrendResult | null {
  const match = text.match(/\{[^{}]*"score"[^{}]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const score = Number(parsed.score);
    const rationale = String(parsed.rationale ?? "").trim();
    if (!Number.isFinite(score) || !rationale) return null;
    return { score: Math.max(0, Math.min(100, Math.round(score))), rationale };
  } catch {
    return null;
  }
}

export async function getTrendScore(
  brandFocus: string | undefined,
  category: string,
  quarter: string
): Promise<TrendResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const brandLine = brandFocus ? `Brand: ${brandFocus}` : "No specific brand focus — general market read.";

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system:
        "You are a fashion retail trend analyst. Research current demand and trend momentum for the given " +
        "brand and category ahead of the specified quarter using web search — recent runway/editorial coverage, " +
        "retail buying reports, and search/social trend signal. Respond with a short rationale (2-3 sentences), " +
        'then end your response with exactly one JSON object on its own line: {"score": <integer 0-100>, "rationale": "<one sentence>"}. ' +
        "Do not include any other JSON in your response.",
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `${brandLine}\nCategory: ${category}\nTarget quarter: ${quarter}\n\nHow strong is demand/trend momentum for this heading into ${quarter}? Score 0-100.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const text = extractText(response.content);
    return parseTrendJson(text);
  } catch {
    return null;
  }
}
