"use client";
import { useEffect, useState } from "react";

type Derived = {
  summary: string;
  voice: { register: string; formality: string; stance: string };
  sentences: { rhythm: string; typical_openers: string[]; connectors: string[] };
  lexicon: { signature_phrases: string[]; domain_vocabulary: string[]; avoided_words: string[] };
  formatting: { emoji: string; hashtags: string; line_breaks: string; typical_length: string };
  substance: { what_they_add: string; recurring_themes: string[] };
  tells: string[]; do_not: string[]; confidence_notes: string;
};
type Profile = {
  id: string; name: string; language: string; isDefault: boolean;
  rules: string; doNots: string; samples: string; derived: Derived | null; derivedAt: string | null;
};

export default function StyleEditor() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [busy, setBusy] = useState("");

  async function load(keep?: string) {
    const r = await fetch("/api/style").then((x) => x.json());
    setProfiles(r.profiles || []);
    const next = keep || activeId || r.profiles?.[0]?.id || "";
    setActiveId(next);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const p = profiles.find((x) => x.id === activeId);

  async function create() {
    const name = prompt("Name des Profils, z.B. 'DE — nüchtern' oder 'EN — founder voice'");
    if (!name) return;
    const r = await fetch("/api/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then((x) => x.json());
    await load(r.profile.id);
  }

  async function save(patch: Partial<Profile>) {
    if (!p) return;
    setBusy("Speichere …");
    await fetch(`/api/style/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setBusy("gespeichert");
    await load(p.id);
    setTimeout(() => setBusy(""), 1200);
  }

  async function derive() {
    if (!p) return;
    setBusy("Claude analysiert deinen Stil …");
    const r = await fetch(`/api/style/${p.id}/derive`, { method: "POST" });
    if (!r.ok) { setBusy(""); alert((await r.json()).error || "Fehler"); return; }
    setBusy("Profil abgeleitet");
    await load(p.id);
    setTimeout(() => setBusy(""), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <select className="rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm" value={activeId} onChange={(e) => setActiveId(e.target.value)}>
          {profiles.map((x) => <option key={x.id} value={x.id}>{x.name}{x.isDefault ? " (Standard)" : ""}</option>)}
        </select>
        <button className="btn" onClick={create}>Neues Profil</button>
        {p && !p.isDefault && <button className="btn" onClick={() => save({ isDefault: true } as Partial<Profile>)}>Als Standard</button>}
        {p && <button className="btn" onClick={async () => { if (confirm("Profil löschen?")) { await fetch(`/api/style/${p.id}`, { method: "DELETE" }); setActiveId(""); load(); } }}>Löschen</button>}
        <div className="flex-1" />
        <span className="text-sm text-muted">{busy}</span>
      </div>

      {!p && <div className="card p-6 text-sm text-muted">Lege ein Profil an, um loszulegen.</div>}

      {p && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="card space-y-3 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">Name</label>
                  <input className="input" defaultValue={p.name} onBlur={(e) => save({ name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Sprache</label>
                  <select className="input" defaultValue={p.language} onChange={(e) => save({ language: e.target.value })}>
                    <option value="de">Deutsch</option><option value="en">Englisch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Textproben — eigene Posts & Kommentare, mit --- getrennt</label>
                <textarea className="input min-h-[240px] font-mono text-xs" defaultValue={p.samples}
                  placeholder={"Post 1 …\n---\nKommentar 1 …\n---\nPost 2 …"}
                  onBlur={(e) => save({ samples: e.target.value })} />
                <p className="mt-1 text-xs text-muted">Je mehr echtes Material, desto besser. 8–15 Proben sind ein guter Startpunkt.</p>
              </div>

              <div>
                <label className="label">Eigene Regeln (überschreiben die Analyse)</label>
                <textarea className="input min-h-[90px]" defaultValue={p.rules}
                  placeholder={"Immer siezen.\nZahlen konkret nennen statt 'viele'.\nNie länger als 4 Sätze."}
                  onBlur={(e) => save({ rules: e.target.value })} />
              </div>

              <div>
                <label className="label">No-Gos</label>
                <textarea className="input min-h-[70px]" defaultValue={p.doNots}
                  placeholder={"Keine Emojis.\nKein 'Game Changer', kein 'excited to share'.\nNie über Portfolio-Bewertungen sprechen."}
                  onBlur={(e) => save({ doNots: e.target.value })} />
              </div>

              <button className="btn-primary" onClick={derive}>Stilprofil aus Proben ableiten</button>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Abgeleitetes Profil {p.derivedAt && <span className="ml-2 text-xs font-normal text-muted">{new Date(p.derivedAt).toLocaleString("de-DE")}</span>}</h3>
            {!p.derived && <p className="text-sm text-muted">Noch nicht abgeleitet. Proben einfügen und links den Button drücken.</p>}
            {p.derived && <DerivedView d={p.derived} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | string[] }) {
  const val = Array.isArray(v) ? v.join(" · ") : v;
  if (!val) return null;
  return (
    <div className="border-t border-edge py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{k}</div>
      <div className="text-sm">{val}</div>
    </div>
  );
}

function DerivedView({ d }: { d: Derived }) {
  return (
    <div className="text-sm">
      <p className="mb-2 leading-relaxed">{d.summary}</p>
      <Row k="Register" v={d.voice?.register} />
      <Row k="Formalität" v={d.voice?.formality} />
      <Row k="Haltung" v={d.voice?.stance} />
      <Row k="Satzrhythmus" v={d.sentences?.rhythm} />
      <Row k="Typische Satzanfänge" v={d.sentences?.typical_openers} />
      <Row k="Signaturphrasen" v={d.lexicon?.signature_phrases} />
      <Row k="Fachvokabular" v={d.lexicon?.domain_vocabulary} />
      <Row k="Vermeidet" v={d.lexicon?.avoided_words} />
      <Row k="Länge" v={d.formatting?.typical_length} />
      <Row k="Emoji / Hashtags" v={`${d.formatting?.emoji} — ${d.formatting?.hashtags}`} />
      <Row k="Mehrwert" v={d.substance?.what_they_add} />
      <Row k="Themen" v={d.substance?.recurring_themes} />
      {!!d.tells?.length && (
        <div className="border-t border-edge py-2">
          <div className="text-[11px] uppercase tracking-wide text-muted">Fingerabdrücke</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{d.tells.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {!!d.do_not?.length && (
        <div className="border-t border-edge py-2">
          <div className="text-[11px] uppercase tracking-wide text-muted">Nie tun</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{d.do_not.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {d.confidence_notes && <p className="mt-3 border-t border-edge pt-2 text-xs text-warn">{d.confidence_notes}</p>}
    </div>
  );
}
