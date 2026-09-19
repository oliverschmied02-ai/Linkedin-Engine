# Workflow „LinkedIn sammeln" — Prompt für Claude (in Chrome oder Claude Code)

<!-- APP_URL und COLLECTOR_KEY ersetzen. Als Shortcut speichern oder Claude direkt geben. -->

Du sammelst neue LinkedIn-Posts der Watchlist-Personen und schickst sie an meine LinkedIn Engine.
Arbeite die Schritte exakt ab und stelle keine Rückfragen.

Konfiguration:
- APP_URL = https://linkedin-engine-production-6935.up.railway.app
- COLLECTOR_KEY = <aus den Railway-Variablen>

## Schritt 1: Watchlist holen

```js
const r = await fetch("APP_URL/api/targets", { headers: { "x-collector-key": "COLLECTOR_KEY" } });
await r.json();
```

Das Ergebnis enthält `targets[]` mit `name`, `profileUrl`, `activityUrl`, `active`. Nur aktive Personen bearbeiten.

## Schritt 2: Pro Person die neuesten Posts einsammeln

Für jede Person:
1. Öffne `activityUrl`. Warte, bis die Seite geladen ist. Scrolle zweimal langsam nach unten (~10 Posts).
2. Klicke bei sichtbaren Posts auf „…mehr" / „…more", damit der volle Text da ist.
3. Extrahiere die Posts per JavaScript. Ausgangspunkt (Selektoren bei Bedarf an das aktuelle LinkedIn-Markup anpassen):

```js
const out = [];
document.querySelectorAll('div[data-urn^="urn:li:activity:"], div.feed-shared-update-v2').forEach(el => {
  const raw = el.getAttribute("data-urn") || el.getAttribute("data-id") || (el.querySelector('[data-urn*="urn:li:activity"]')?.getAttribute("data-urn") ?? "");
  const m = raw.match(/urn:li:activity:\d+/);
  if (!m) return;
  const urn = m[0];
  const text = (el.querySelector('.update-components-text') || el).innerText.trim();
  const isRepost = /reposted|hat das geteilt|reposted this/i.test(el.innerText.slice(0, 200));
  const count = (s) => { const t = el.querySelector(s)?.innerText || ""; const n = parseFloat(t.replace(/\./g, "").replace(/,/g, ".")); return Number.isFinite(n) ? Math.round(/[km]/i.test(t) ? n * (/m/i.test(t) ? 1e6 : 1e3) : n) : 0; };
  if (urn && text.length > 40 && !isRepost && !out.some(p => p.urn === urn)) out.push({
    urn,
    url: `https://www.linkedin.com/feed/update/${urn}/`,
    text: text.slice(0, 6000),
    reactions: count('.social-details-social-counts__reactions-count'),
    comments: count('.social-details-social-counts__comments'),
    source: "activity",
  });
});
JSON.stringify(out);
```

4. Ergänze bei jedem Post `authorName` (Name der Person) und `authorUrl` (ihre `profileUrl`).
5. Nur Posts behalten, die die Person selbst verfasst hat — keine Reposts, keine Kommentare auf fremde Posts.
6. Wenn bei einer Person nichts extrahierbar ist: notieren, weiter mit der nächsten. Zwischen Personen 5–10 Sekunden warten.

## Schritt 3: An die App senden (ein Request für alles)

```js
await fetch("APP_URL/api/ingest", {
  method: "POST",
  headers: { "x-collector-key": "COLLECTOR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ onlyWatched: true, posts: POSTS })
}).then(r => r.json());
```

Die App dedupliziert selbst — bekannte Posts werden nur mit frischen Engagement-Zahlen aktualisiert.

## Schritt 4: Triage anstoßen

```js
await fetch("APP_URL/api/triage/run", {
  method: "POST",
  headers: { "x-collector-key": "COLLECTOR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ limit: 40 })
}).then(r => r.json());
```

## Schritt 5: Kurzbericht

Zwei Sätze: wie viele Personen besucht, wie viele Posts gesendet (`created` / `duplicates`), wie viele triagiert, wo es Probleme gab.

## Regeln

- Nur lesen. Nichts kommentieren, nichts liken, niemandem folgen.
- Menschliches Tempo: Pausen zwischen Seiten, kein Dauerfeuer.
- Bei Captcha oder Sicherheitshinweis: sofort abbrechen und Bescheid geben.
- Geöffnete LinkedIn-Tabs am Ende schließen.
