# LinkedIn Engine

Kommentar-Engine für LinkedIn: Watchlist von Personen, deren Posts du im Browser einsammelst,
Relevanz-Triage, Kommentar-Entwürfe in deinem eigenen Stil, Freigabe durch dich, Einfügen zurück
in LinkedIn. Deutsch und Englisch.

**Human in the loop by design:** Die App schickt nichts selbstständig an LinkedIn. Sie füllt die
Kommentarbox — abschicken tust du.

## Architektur

```
Browser (dein Login)                Railway                      Anthropic
┌────────────────────┐         ┌──────────────────┐         ┌─────────────┐
│ Tampermonkey-      │ ingest  │ Next.js + API    │ prompts │  Claude     │
│ Userscript         ├────────►│ Postgres         ├────────►│  Triage     │
│ · liest Feed/DOM   │         │ · Watchlist      │         │  Entwürfe   │
│ · fügt Kommentar   │◄────────┤ · Stilprofile    │◄────────┤  Stilanalyse│
│   in die Box ein   │ outbox  │ · Review-UI      │         └─────────────┘
└────────────────────┘         └──────────────────┘
```

Kein Headless-Browser, keine gespeicherten LinkedIn-Zugangsdaten. Der Collector liest nur, was in
deinem eingeloggten Browser ohnehin auf dem Bildschirm steht.

## Stack

Next.js 15 (App Router) · Drizzle ORM · Postgres · LLM provider-agnostisch (OpenAI-kompatibel) · Tailwind

## Deploy auf Railway

1. Repo in Railway als neues Projekt verbinden (**New Project → Deploy from GitHub repo**).
2. Im selben Projekt **New → Database → Postgres** anlegen. Railway setzt `DATABASE_URL` automatisch,
   wenn du im Service unter *Variables* `DATABASE_URL=${{Postgres.DATABASE_URL}}` referenzierst.
3. Weitere Variablen setzen:

   | Variable | Zweck |
   |---|---|
   | `LLM_API_KEY` | API-Key deines LLM-Anbieters (z.B. openrouter.ai — Free-Modelle verfügbar) |
   | `APP_PASSWORD` | Passwort für das Web-UI |
   | `COLLECTOR_KEY` | langer Zufallsstring; Shared Secret für das Userscript |
   | `NEXT_PUBLIC_APP_URL` | die öffentliche Railway-URL, z.B. `https://…up.railway.app` |
   | `LLM_BASE_URL` | optional, Default `https://openrouter.ai/api/v1` |
   | `LLM_MODEL` | optional, Default `meta-llama/llama-3.3-70b-instruct` |

   Die Anbindung ist provider-agnostisch (OpenAI-kompatibles Chat-Completions-Format mit
   Function-Calling). Beispiele für OpenRouter, Groq, Ollama und Anthropic stehen in
   `.env.example`; das Modell muss Function-Calling können.

4. Deployen. Der Startbefehl (`railway.json`) legt das Schema per `drizzle-kit push` selbst an.
5. `/setup` in der App öffnen und dem Ablauf dort folgen.

## Lokal

```bash
cp .env.example .env    # Werte eintragen
npm install
npm run db:push
npm run dev
```

## Ablauf

1. **Watchlist** — Personen anlegen. Das Feld *Warum relevant?* ist wichtig: es geht in Triage und
   Generierung ein und entscheidet stark über die Qualität.
2. **Stilprofil** — 8–15 eigene Posts und Kommentare einfügen, `---` als Trenner, ableiten lassen.
   Eigene Regeln und No-Gos schlagen die Analyse. Mehrere Profile möglich (z.B. DE und EN).
3. **Sammeln** — auf LinkedIn im Panel unten rechts *Scrollen + sammeln*. Funktioniert im Feed und
   auf `…/recent-activity/all/` einer Person.
4. **Triage** — Claude bewertet, wo ein Kommentar überhaupt lohnt. Die Mehrheit fällt durch; das ist
   Absicht.
5. **Entwürfe** — drei Varianten mit unterschiedlichen Stoßrichtungen, nicht drei Umformulierungen.
   Bearbeiten, Feedback notieren, freigeben.
6. **Posten** — im Panel *Freigegebene Kommentare laden* → *Einfügen* → selbst abschicken →
   *Als gepostet markieren*.

Platzhalter `[[…]]` in einem Entwurf bedeuten: hier gehört eine konkrete Zahl oder Erfahrung hin,
die Claude nicht erfinden darf. Freigeben ist blockiert, solange sie drinstehen.

## Grenzen, ehrlich

- **LinkedIn-API:** Selbst freischaltbar sind nur OIDC-Login und `w_member_social` (eigene Posts,
  Kommentare, Likes). Fremde Posts lesen, Feed-Zugriff und Analytics laufen über die
  Community Management API und brauchen eine Freigabe von LinkedIn. Darum der Browser-Weg.
- **ToS:** Automatisiertes Auslesen widerspricht LinkedIns Nutzungsbedingungen. Dieses Setup bleibt
  bewusst nah am manuellen Verhalten (dein Browser, deine Session, dein Scrollen, dein Klick zum
  Absenden), ist aber formal Grauzone. Tempo menschlich halten.
- **DOM-Selektoren:** LinkedIn ändert sein Markup regelmäßig. Alle Selektoren stehen gesammelt im
  Block `SEL` in `public/collector.user.js`.
- **Analytics** (Punkt 4 der ursprünglichen Idee) ist noch nicht drin, ebenso wenig die
  Content-Pipeline für eigene Posts. Das Datenmodell ist dafür vorbereitet.

## Wichtigste Stellschraube

`src/lib/prompts.ts`. Die Qualität der Kommentare hängt fast vollständig an diesen Prompts und an
den Notizen in der Watchlist — nicht am Modell.
