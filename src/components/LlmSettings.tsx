"use client";
import { useCallback, useEffect, useState } from "react";

type Settings = { baseUrl: string; modelGenerate: string; modelTriage: string };
type ModelInfo = { id: string; name: string; free: boolean };

const PRESETS: Array<{ label: string; baseUrl: string }> = [
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { label: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  { label: "Ollama (lokal)", baseUrl: "http://localhost:11434/v1" },
];

export default function LlmSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [modelsErr, setModelsErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadModels = useCallback(async () => {
    setModelsErr("");
    setModels([]);
    const r = await fetch("/api/models");
    const data = await r.json();
    if (!r.ok) { setModelsErr(data.error || "Modell-Liste nicht abrufbar"); return; }
    setModels(data.models || []);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/settings").then((x) => x.json());
      setSettings(r.settings);
      setHasApiKey(r.hasApiKey);
      loadModels();
    })();
  }, [loadModels]);

  if (!settings) return <p className="text-sm text-muted">Lade …</p>;

  const shown = freeOnly ? models.filter((m) => m.free) : models;

  async function save() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(data.error || "Fehler beim Speichern"); return; }
    setSettings(data.settings);
    setMsg("Gespeichert.");
    loadModels();
  }

  return (
    <div className="space-y-4">
      {!hasApiKey && (
        <div className="card border-red-500/40 p-4 text-sm text-red-400">
          <b>LLM_API_KEY fehlt.</b> Der Key wird aus Sicherheitsgründen nicht hier, sondern als
          Umgebungsvariable gesetzt (Railway → Service → Variables). Ohne ihn funktioniert keine
          Triage und keine Generierung.
        </div>
      )}

      <div className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Anbieter</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Preset</label>
            <select
              className="rounded-lg border border-edge bg-ink px-2 py-2 text-sm"
              value={PRESETS.find((p) => p.baseUrl === settings.baseUrl)?.baseUrl ?? "custom"}
              onChange={(e) => { if (e.target.value !== "custom") setSettings({ ...settings, baseUrl: e.target.value }); }}
            >
              {PRESETS.map((p) => <option key={p.baseUrl} value={p.baseUrl}>{p.label}</option>)}
              <option value="custom">Eigene URL</option>
            </select>
          </div>
          <div className="min-w-[280px] flex-1">
            <label className="label">Base-URL (OpenAI-kompatibel)</label>
            <input className="input" value={settings.baseUrl} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted">
          Der API-Key kommt aus der Umgebungsvariable <code>LLM_API_KEY</code> und wird hier nie angezeigt oder gespeichert.
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Modelle</h2>
          <button className="btn" onClick={loadModels}>Liste neu laden</button>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            nur kostenlose
          </label>
          {models.length > 0 && <span className="chip">{shown.length} Modelle</span>}
        </div>
        {modelsErr && <p className="text-sm text-warn">{modelsErr} — du kannst die Modell-IDs trotzdem von Hand eintragen.</p>}

        <datalist id="model-options">
          {shown.map((m) => <option key={m.id} value={m.id}>{m.free ? `${m.name} (free)` : m.name}</option>)}
        </datalist>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Generierung (Entwürfe, Stilanalyse — Qualität zählt)</label>
            <input className="input" list="model-options" value={settings.modelGenerate}
              onChange={(e) => setSettings({ ...settings, modelGenerate: e.target.value })} />
          </div>
          <div>
            <label className="label">Triage (Relevanzbewertung — billig/frei reicht)</label>
            <input className="input" list="model-options" value={settings.modelTriage}
              onChange={(e) => setSettings({ ...settings, modelTriage: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted">Tippen filtert die Liste. Das Modell muss Function-Calling unterstützen — sonst greift der JSON-Fallback, der je nach Modell unzuverlässiger ist.</p>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
          {msg && <span className={`text-sm ${msg === "Gespeichert." ? "text-muted" : "text-red-400"}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
