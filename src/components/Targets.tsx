"use client";
import { useEffect, useState } from "react";

type Target = {
  id: string; name: string; profileUrl: string; headline: string; notes: string;
  followers: number | null; summary: string; enrichedAt: string | null;
  priority: number; active: boolean; lastSeenAt: string | null; _count: { posts: number };
};

const fmtFollowers = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1).replace(".0", "")}M` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(n);

export default function Targets() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [form, setForm] = useState({ name: "", profileUrl: "", headline: "", notes: "", priority: 2 });
  const [editing, setEditing] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const r = await fetch("/api/targets").then((x) => x.json());
    setTargets(r.targets || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    setForm({ name: "", profileUrl: "", headline: "", notes: "", priority: 2 });
    load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/targets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Person zur Watchlist hinzufügen</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Profil-URL</label>
            <input className="input" placeholder="https://www.linkedin.com/in/…" value={form.profileUrl} onChange={(e) => setForm({ ...form, profileUrl: e.target.value })} required />
          </div>
          <div>
            <label className="label">Name (optional — kommt sonst aus der Anreicherung)</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Warum relevant? (fließt in Triage und Kommentar-Generierung ein)</label>
          <textarea className="input min-h-[70px]" placeholder="z.B. GP eines Berliner Seed-Fonds, postet zu Fundraising-Dynamik — ich kann die LP-Perspektive beisteuern" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted">Priorität
            <select className="ml-2 rounded-lg border border-edge bg-ink px-2 py-1 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
              <option value={1}>1 — hoch</option><option value={2}>2 — mittel</option><option value={3}>3 — niedrig</option>
            </select>
          </label>
          <button className="btn-primary">Hinzufügen</button>
          {err && <span className="text-sm text-red-400">{err}</span>}
        </div>
        <p className="text-xs text-muted">
          Follower-Zahl und Kurzbeschreibung werden automatisch ergänzt, sobald das Profil einmal im
          Browser erfasst wurde (Panel-Button <i>Profil erfassen</i> auf der Profilseite).
        </p>
      </form>

      <div className="card divide-y divide-edge">
        {!targets.length && <p className="p-4 text-sm text-muted">Noch niemand auf der Watchlist.</p>}
        {targets.map((t) => (
          <div key={t.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a className="font-medium hover:underline" href={t.profileUrl} target="_blank" rel="noreferrer">{t.name}</a>
                  <span className="chip">P{t.priority}</span>
                  {t.followers != null && <span className="chip">{fmtFollowers(t.followers)} Follower</span>}
                  <span className="chip">{t._count.posts} Posts</span>
                  {!t.enrichedAt && <span className="chip text-warn">nicht angereichert</span>}
                  {!t.active && <span className="chip text-warn">pausiert</span>}
                </div>
                {t.headline && <p className="mt-1 text-xs text-muted">{t.headline}</p>}
              </div>
              <div className="flex gap-2">
                <button className="btn" onClick={() => patch(t.id, { active: !t.active })}>{t.active ? "Pausieren" : "Aktivieren"}</button>
                <button className="btn" onClick={async () => { if (confirm(`${t.name} von der Watchlist entfernen? Bereits gesammelte Posts bleiben erhalten.`)) { await fetch(`/api/targets/${t.id}`, { method: "DELETE" }); load(); } }}>Entfernen</button>
              </div>
            </div>

            {t.summary && (
              <p className="rounded-lg border border-edge bg-ink/60 p-2.5 text-xs leading-relaxed">
                <span className="font-semibold text-muted">Steht für: </span>{t.summary}
              </p>
            )}

            {editing === t.id ? (
              <div className="space-y-2">
                <textarea className="input min-h-[60px] text-xs" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={async () => { await patch(t.id, { notes: editNotes }); setEditing(null); }}>Speichern</button>
                  <button className="btn" onClick={() => setEditing(null)}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <p className="cursor-pointer text-xs text-muted hover:text-slate-300" title="Klicken zum Bearbeiten"
                onClick={() => { setEditing(t.id); setEditNotes(t.notes); }}>
                <span className="font-semibold">Warum relevant: </span>
                {t.notes || <i>noch leer — klicken und ausfüllen (wichtig für die Triage-Qualität)</i>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
