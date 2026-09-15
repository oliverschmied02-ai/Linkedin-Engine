"use client";
import { useCallback, useEffect, useState } from "react";

type Variant = { angle: string; text: string; rationale: string; risk: string };
type Draft = {
  id: string; language: string; variants: Variant[]; chosenIndex: number | null;
  finalText: string; status: string; feedback: string;
};
type Post = {
  id: string; urn: string; url: string; authorName: string; authorHeadline: string;
  text: string; postedAtText: string; reactions: number; comments: number;
  relevance: number | null; relevanceWhy: string; status: string; language: string;
  target: { name: string; notes: string } | null;
  drafts: Draft[];
};
type StyleProfile = { id: string; name: string; language: string; isDefault: boolean };

function Badge({ n }: { n: number | null }) {
  if (n === null) return <span className="chip">nicht bewertet</span>;
  const tone = n >= 75 ? "text-good border-good/40" : n >= 55 ? "text-warn border-warn/40" : "text-muted border-edge";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>Relevanz {n}</span>;
}

export default function Queue() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [minRel, setMinRel] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      fetch(`/api/posts?minRelevance=${minRel}&status=${status}`).then((r) => r.json()),
      fetch("/api/style").then((r) => r.json()),
    ]);
    setPosts(p.posts || []);
    setProfiles(s.profiles || []);
    setLoading(false);
  }, [minRel, status]);

  useEffect(() => { load(); }, [load]);

  async function runTriage() {
    setNote("Triage läuft …");
    const r = await fetch("/api/triage/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 15 }) }).then((x) => x.json());
    setNote(r.error ? `Fehler: ${r.error}` : `${r.triaged} Posts bewertet.`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <button className="btn-primary" onClick={runTriage}>Triage starten</button>
        <label className="flex items-center gap-2 text-sm text-muted">
          Mindest-Relevanz
          <select className="rounded-lg border border-edge bg-ink px-2 py-1 text-sm" value={minRel} onChange={(e) => setMinRel(Number(e.target.value))}>
            {[0, 40, 55, 70, 80].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Status
          <select className="rounded-lg border border-edge bg-ink px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">offen</option>
            <option value="new">neu</option>
            <option value="triaged">bewertet</option>
            <option value="drafted">Entwurf da</option>
            <option value="done">erledigt</option>
            <option value="all">alle</option>
          </select>
        </label>
        <button className="btn" onClick={load}>Neu laden</button>
        <span className="text-sm text-muted">{note}</span>
      </div>

      {loading && <p className="text-sm text-muted">Lade …</p>}
      {!loading && !posts.length && (
        <div className="card p-6 text-sm text-muted">
          Nichts in der Queue. Sammle Posts mit dem Browser-Collector ein — siehe <a className="text-accent underline" href="/setup">Setup</a>.
        </div>
      )}

      {posts.map((p) => <PostCard key={p.id} post={p} profiles={profiles} onChange={load} />)}
    </div>
  );
}

function PostCard({ post, profiles, onChange }: { post: Post; profiles: StyleProfile[]; onChange: () => void }) {
  const [open, setOpen] = useState(post.text.length < 700);
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [profileId, setProfileId] = useState(profiles.find((x) => x.isDefault)?.id || "");
  const [lang, setLang] = useState(post.language || "");
  const draft = post.drafts?.[0];

  async function generate() {
    setBusy(true);
    const r = await fetch(`/api/posts/${post.id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleProfileId: profileId || undefined, language: lang || undefined, instruction }),
    });
    setBusy(false);
    if (!r.ok) { alert((await r.json()).error || "Fehler"); return; }
    onChange();
  }

  async function ignore() {
    await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ignored" }) });
    onChange();
  }

  return (
    <article className="card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge n={post.relevance} />
        <span className="font-medium">{post.authorName}</span>
        {post.authorHeadline && <span className="text-xs text-muted">· {post.authorHeadline.slice(0, 70)}</span>}
        <span className="chip">{post.postedAtText || "—"}</span>
        <span className="chip">{post.reactions} Reaktionen · {post.comments} Kommentare</span>
        <div className="flex-1" />
        {post.url && <a className="text-xs text-accent underline" href={post.url} target="_blank" rel="noreferrer">auf LinkedIn</a>}
      </div>

      {post.relevanceWhy && <p className="mb-2 text-xs text-muted">{post.relevanceWhy}</p>}

      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${open ? "" : "line-clamp-5"}`}>{post.text}</p>
      {post.text.length >= 700 && (
        <button className="mt-1 text-xs text-accent" onClick={() => setOpen(!open)}>{open ? "weniger" : "mehr anzeigen"}</button>
      )}

      {!draft && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-edge pt-3">
          <select className="rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Standard-Stilprofil</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">Sprache automatisch</option>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
          </select>
          <input className="input flex-1 min-w-[200px]" placeholder="Optional: eigener Winkel, z.B. 'bring den Fondsperspektive-Punkt'" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
          <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? "Generiere …" : "Entwürfe generieren"}</button>
          <button className="btn" onClick={ignore}>Ignorieren</button>
        </div>
      )}

      {draft && <DraftBlock draft={draft} onChange={onChange} onRegenerate={generate} busy={busy} />}
    </article>
  );
}

function DraftBlock({ draft, onChange, onRegenerate, busy }: { draft: Draft; onChange: () => void; onRegenerate: () => void; busy: boolean }) {
  const variants: Variant[] = Array.isArray(draft.variants) ? draft.variants : [];
  const [chosen, setChosen] = useState<number>(draft.chosenIndex ?? 0);
  const [text, setText] = useState(draft.finalText || variants[draft.chosenIndex ?? 0]?.text || "");
  const [feedback, setFeedback] = useState(draft.feedback || "");
  const [saved, setSaved] = useState("");

  function selectVariant(i: number) {
    setChosen(i);
    setText(variants[i]?.text || "");
  }

  async function patch(body: Record<string, unknown>) {
    const r = await fetch(`/api/drafts/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { alert("Fehler beim Speichern"); return false; }
    return true;
  }

  return (
    <div className="mt-3 space-y-3 border-t border-edge pt-3">
      <div className="grid gap-2 md:grid-cols-3">
        {variants.map((v, i) => (
          <button key={i} onClick={() => selectVariant(i)}
            className={`rounded-lg border p-3 text-left text-xs transition ${chosen === i ? "border-accent bg-accent/10" : "border-edge bg-ink hover:border-muted"}`}>
            <div className="mb-1 font-semibold text-slate-200">{v.angle}</div>
            <div className="mb-2 whitespace-pre-wrap text-slate-300">{v.text}</div>
            <div className="text-muted">{v.rationale}</div>
            {v.risk && <div className="mt-1 text-warn">⚠ {v.risk}</div>}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Finaler Kommentar ({draft.language})</label>
        <textarea className="input min-h-[110px] font-normal" value={text} onChange={(e) => setText(e.target.value)} />
        <p className="mt-1 text-xs text-muted">{text.length} Zeichen{text.includes("[[") && " · enthält noch Platzhalter [[…]]"}</p>
      </div>

      <div>
        <label className="label">Feedback (was war gut/schlecht — fließt in dein Stilprofil)</label>
        <input className="input" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="z.B. zu akademisch, zu lang, Einstieg zu weich" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={!text.trim() || text.includes("[[")}
          onClick={async () => { if (await patch({ chosenIndex: chosen, finalText: text, feedback, status: "approved" })) { setSaved("freigegeben"); onChange(); } }}>
          Freigeben → Outbox
        </button>
        <button className="btn" onClick={async () => { if (await patch({ chosenIndex: chosen, finalText: text, feedback })) setSaved("gespeichert"); }}>
          Nur speichern
        </button>
        <button className="btn" onClick={onRegenerate} disabled={busy}>Neu generieren</button>
        <button className="btn" onClick={async () => { if (await patch({ status: "skipped" })) onChange(); }}>Verwerfen</button>
        {text.includes("[[") && <span className="text-xs text-warn">Platzhalter [[…]] noch ausfüllen</span>}
        {saved && <span className="text-xs text-good">{saved}</span>}
      </div>
    </div>
  );
}
