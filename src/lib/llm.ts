/**
 * Provider-agnostischer LLM-Client über das OpenAI-kompatible Chat-Completions-Format.
 *
 * Funktioniert mit jedem Anbieter, der /chat/completions mit Function-Calling spricht:
 *   OpenRouter   LLM_BASE_URL=https://openrouter.ai/api/v1     LLM_MODEL=z.B. meta-llama/llama-3.3-70b-instruct
 *   Groq         LLM_BASE_URL=https://api.groq.com/openai/v1   LLM_MODEL=z.B. llama-3.3-70b-versatile
 *   Ollama       LLM_BASE_URL=http://localhost:11434/v1        LLM_MODEL=z.B. qwen2.5:14b (LLM_API_KEY=ollama)
 *   Anthropic    LLM_BASE_URL=https://api.anthropic.com/v1     LLM_MODEL=z.B. claude-sonnet-4-5
 */

const BASE_URL = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
export const MODEL = process.env.LLM_MODEL || "meta-llama/llama-3.3-70b-instruct";

function apiKey() {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error("LLM_API_KEY fehlt");
  return key;
}

type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };

/** Zieht JSON auch aus Antworten, die es in ```-Zäune oder Begleittext packen. */
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error(`Modellantwort ist kein JSON: ${trimmed.slice(0, 200)}`);
  }
}

/**
 * Ruft das Modell mit erzwungenem Tool-Use auf und gibt das geparste Tool-Input zurück.
 * Fallback für Modelle, die tool_choice ignorieren: JSON aus dem Antworttext parsen.
 */
export async function structured<T>(opts: {
  system: string;
  user: string;
  tool: ToolDef;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
      // Von OpenRouter fürs Ranking genutzt, von anderen Anbietern ignoriert.
      "X-Title": "LinkedIn Engine",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.7,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: opts.tool.name,
            description: opts.tool.description,
            parameters: opts.tool.input_schema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: opts.tool.name } },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM-Anfrage fehlgeschlagen (${res.status} ${MODEL}): ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
      };
    }>;
  };

  const message = data.choices?.[0]?.message;
  const call = message?.tool_calls?.find((c) => c.function?.name === opts.tool.name) ?? message?.tool_calls?.[0];
  if (call?.function?.arguments) return parseJsonLoose(call.function.arguments) as T;
  if (message?.content) return parseJsonLoose(message.content) as T;

  throw new Error("Das Modell hat kein strukturiertes Ergebnis geliefert");
}
