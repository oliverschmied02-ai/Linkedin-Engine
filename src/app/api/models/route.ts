import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { getLlmSettings } from "@/lib/settings";
import { apiKey } from "@/lib/llm";

export type ModelInfo = {
  id: string;
  name: string;
  /** true, wenn Prompt- und Completion-Preis 0 sind (OpenRouter) oder kein Preis bekannt ist (z.B. Ollama). */
  free: boolean;
};

/** Listet die beim konfigurierten Anbieter verfügbaren Modelle (GET /models, OpenAI-Format). */
export async function GET() {
  const g = await requireUser();
  if (g) return g;
  const { baseUrl } = await getLlmSettings();

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Modell-Liste nicht abrufbar (${res.status}): ${body.slice(0, 300)}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      data?: Array<{ id?: string; name?: string; pricing?: { prompt?: string; completion?: string } }>;
    };
    const models: ModelInfo[] = (data.data ?? [])
      .filter((m) => m.id)
      .map((m) => ({
        id: m.id!,
        name: m.name || m.id!,
        free: m.pricing ? Number(m.pricing.prompt || 0) === 0 && Number(m.pricing.completion || 0) === 0 : true,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return NextResponse.json({ models });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Anbieter nicht erreichbar" }, { status: 502 });
  }
}
