import { inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "./schema";

/**
 * LLM-Einstellungen: im UI gepflegt, in der DB gespeichert.
 * Env-Variablen (LLM_BASE_URL, LLM_MODEL) dienen nur als Startwert/Fallback.
 * Der API-Key bleibt bewusst ausschließlich in der Env (LLM_API_KEY).
 */
export type LlmSettings = {
  baseUrl: string;
  /** Modell für Kommentar-Entwürfe und Stilanalyse — hier zählt Qualität. */
  modelGenerate: string;
  /** Modell für die Relevanz-Triage — Massengeschäft, darf billig/frei sein. */
  modelTriage: string;
};

export function llmDefaults(): LlmSettings {
  const model = process.env.LLM_MODEL || "meta-llama/llama-3.3-70b-instruct";
  return {
    baseUrl: process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1",
    modelGenerate: model,
    modelTriage: process.env.LLM_MODEL_TRIAGE || model,
  };
}

const KEYS: Record<keyof LlmSettings, string> = {
  baseUrl: "llm.baseUrl",
  modelGenerate: "llm.modelGenerate",
  modelTriage: "llm.modelTriage",
};

export async function getLlmSettings(): Promise<LlmSettings> {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, Object.values(KEYS)));
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const defaults = llmDefaults();
  return {
    baseUrl: (stored[KEYS.baseUrl] || defaults.baseUrl).replace(/\/$/, ""),
    modelGenerate: stored[KEYS.modelGenerate] || defaults.modelGenerate,
    modelTriage: stored[KEYS.modelTriage] || defaults.modelTriage,
  };
}

export async function setLlmSettings(patch: Partial<LlmSettings>): Promise<void> {
  const entries = (Object.keys(KEYS) as Array<keyof LlmSettings>)
    .filter((k) => typeof patch[k] === "string" && patch[k]!.trim())
    .map((k) => ({ key: KEYS[k], value: patch[k]!.trim() }));
  if (!entries.length) return;
  await db
    .insert(appSettings)
    .values(entries)
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: sql`excluded.value`, updatedAt: sql`now()` },
    });
}
