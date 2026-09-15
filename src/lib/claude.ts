import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };

/**
 * Ruft Claude mit erzwungenem Tool-Use auf und gibt das geparste Tool-Input zurück.
 * Das ist robuster als JSON aus Freitext zu fischen.
 */
export async function structured<T>(opts: {
  system: string;
  user: string;
  tool: ToolDef;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    tools: [opts.tool as never],
    tool_choice: { type: "tool", name: opts.tool.name },
    messages: [{ role: "user", content: opts.user }],
  });

  for (const block of res.content) {
    if (block.type === "tool_use" && block.name === opts.tool.name) {
      return block.input as T;
    }
  }
  throw new Error("Claude hat kein strukturiertes Ergebnis geliefert");
}
