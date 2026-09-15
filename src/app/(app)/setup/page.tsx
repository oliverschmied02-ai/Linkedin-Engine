export const dynamic = "force-dynamic";

export default function Setup() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const scriptUrl = appUrl ? `${appUrl}/collector.user.js` : "/collector.user.js";

  return (
    <div className="space-y-4">
      <section className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold">1 · Browser-Collector installieren</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li><a className="text-accent underline" href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer">Tampermonkey</a> in Chrome installieren.</li>
          <li>
            Dieses Skript öffnen und installieren:{" "}
            <a className="text-accent underline" href={scriptUrl}>{scriptUrl}</a>
          </li>
          <li>linkedin.com öffnen — unten rechts erscheint das Panel „LinkedIn Engine“.</li>
          <li>Im Panel auf ⚙ klicken und App-URL sowie den <code className="rounded bg-ink px-1">COLLECTOR_KEY</code> eintragen.</li>
        </ol>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold">2 · Ablauf</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li><b>Watchlist</b> füllen: Personen anlegen, deren Posts du sehen willst.</li>
          <li><b>Stilprofil</b>: eigene Posts/Kommentare einfügen und ableiten lassen.</li>
          <li>Auf LinkedIn im Feed oder auf einer Profilseite („Aktivitäten“) im Panel <b>Scrollen + sammeln</b> drücken.</li>
          <li>In der <b>Queue</b> Triage starten, dann für die guten Posts Entwürfe generieren.</li>
          <li>Variante wählen, editieren, <b>freigeben</b>.</li>
          <li>Im Panel auf LinkedIn <b>Freigegebene Kommentare laden</b> → einfügen → selbst abschicken.</li>
        </ol>
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="text-sm font-semibold">Hinweise</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Der Collector liest nur, was in deinem eingeloggten Browser ohnehin auf dem Bildschirm steht, und sendet nichts automatisch ab.</li>
          <li>Massenhaftes automatisiertes Auslesen widerspricht LinkedIns Nutzungsbedingungen. Halte das Tempo menschlich: ein paar Sammelläufe am Tag, nicht im Minutentakt.</li>
          <li>LinkedIn ändert sein DOM regelmäßig. Wenn nichts mehr gefunden wird, müssen die Selektoren im Block <code className="rounded bg-ink px-1">SEL</code> des Userscripts nachgezogen werden.</li>
        </ul>
      </section>
    </div>
  );
}
