# Workflow „LinkedIn publishen" — Prompt für Claude (in Chrome)

<!-- APP_URL und COLLECTOR_KEY ersetzen. Erst starten, NACHDEM du in der App Kommentare freigegeben hast. -->

Du veröffentlichst Kommentare auf LinkedIn, die ich in meiner LinkedIn Engine bereits einzeln
freigegeben habe. Du veränderst den Text NIE — nicht kürzen, nicht umformulieren, keine Emojis ergänzen.

Konfiguration:
- APP_URL = https://linkedin-engine-production-6935.up.railway.app
- COLLECTOR_KEY = <aus den Railway-Variablen>

## Schritt 1: Freigegebene Kommentare holen

```js
await fetch("APP_URL/api/outbox", { headers: { "x-collector-key": "COLLECTOR_KEY" } }).then(r => r.json());
```

`drafts[]` enthält `id`, `url`, `authorName`, `postPreview`, `text`. Die Liste respektiert bereits das
Tageslimit (`dailyLimit` / `postedToday`). Wenn sie leer ist: melden und beenden.

## Schritt 2: Pro Kommentar veröffentlichen

Für jeden Entwurf, in der gegebenen Reihenfolge:
1. Öffne `url`. Warte, bis der Post vollständig geladen ist.
2. Prüfe, dass der Post von `authorName` stammt und inhaltlich zu `postPreview` passt.
   Wenn nicht: als fehlgeschlagen melden (Schritt 3) und weiter.
3. Klicke auf „Kommentieren" / „Comment", um das Kommentarfeld zu öffnen.
4. Klicke ins Feld und tippe den Text aus `text` exakt ein. Kein Enter — nur tippen.
5. Klicke den Absende-Button des Kommentarfelds („Kommentar veröffentlichen" / „Post" — nicht den Beitrags-Button).
6. Warte 3 Sekunden und verifiziere am Seiteninhalt, dass der Kommentar unter dem Post erscheint.
7. Ergebnis melden (Schritt 3).
8. Vor dem nächsten Kommentar 60–120 Sekunden warten:

```js
await new Promise(r => setTimeout(r, 60000 + Math.random() * 60000)); "ok";
```

## Schritt 3: Ergebnis melden

Erfolg:
```js
await fetch("APP_URL/api/drafts/DRAFT_ID", {
  method: "PATCH",
  headers: { "x-collector-key": "COLLECTOR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ status: "posted" })
});
```

Fehler (Entwurf bleibt freigegeben und kommt beim nächsten Lauf wieder):
```js
await fetch("APP_URL/api/drafts/DRAFT_ID", {
  method: "PATCH",
  headers: { "x-collector-key": "COLLECTOR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ feedback: "Publish fehlgeschlagen: kurze Beschreibung" })
});
```
Bei dauerhaften Fehlern (Post gelöscht, Autor passt nicht): stattdessen `{ "status": "skipped" }` senden.

## Regeln

- Maximal 8 Kommentare pro Durchlauf, auch wenn die Queue länger ist.
- Bei Captcha, Sicherheitsabfrage oder Hinweis auf ungewöhnliche Aktivität: SOFORT abbrechen, nichts weiter tun, Bescheid geben.
- Wenn nicht sicher erkennbar ist, ob ein Kommentar veröffentlicht wurde: als Fehler melden — lieber ein verpasster Kommentar als ein Duplikat.
- Nichts liken, niemandem folgen, keine anderen Posts kommentieren.
- Am Ende: Tabs schließen und in zwei Sätzen berichten, was veröffentlicht wurde und was fehlgeschlagen ist.
