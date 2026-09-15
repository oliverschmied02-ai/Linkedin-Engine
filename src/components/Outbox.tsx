"use client";
import { useEffect, useState } from "react";

type Item = { id: string; urn: string; url: string; authorName: string; postPreview: string; text: string };

export default function Outbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/outbox").then((x) => x.json());
    setItems(r.drafts || []);
  }
  useEffect(() => { load(); }, []);

  async function mark(id: string, status: string) {
    await fetch(`/api/drafts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 text-sm text-muted">
        Freigegebene Kommentare. Der Browser-Collector holt sie sich und fügt sie in die LinkedIn-Kommentarbox ein — abschicken tust du selbst.
        {msg && <span className="ml-2 text-good">{msg}</span>}
      </div>

      {!items.length && <div className="card p-6 text-sm text-muted">Nichts freigegeben.</div>}

      {items.map((d) => (
        <article key={d.id} className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-medium">{d.authorName}</span>
            <div className="flex-1" />
            <a className="text-xs text-accent underline" href={d.url} target="_blank" rel="noreferrer">Post öffnen</a>
          </div>
          <p className="mb-3 text-xs text-muted">{d.postPreview}…</p>
          <p className="whitespace-pre-wrap rounded-lg border border-edge bg-ink p-3 text-sm">{d.text}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn" onClick={async () => { await navigator.clipboard.writeText(d.text); setMsg("kopiert"); setTimeout(() => setMsg(""), 1500); }}>Kopieren</button>
            <button className="btn-primary" onClick={() => mark(d.id, "posted")}>Als gepostet markieren</button>
            <button className="btn" onClick={() => mark(d.id, "draft")}>Zurück in Bearbeitung</button>
          </div>
        </article>
      ))}
    </div>
  );
}
