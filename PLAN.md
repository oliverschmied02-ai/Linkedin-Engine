# LinkedIn Engine — Projektplan

Stand: 15.09.2026 · Owner: Oliver · Hosting: Railway · Repo: oliverschmied02-ai/Linkedin-Engine

## 1. Ziel

Eine persönliche Content-Engine für LinkedIn mit vier Fähigkeiten:

1. **Engagement:** Posts von Personen, die ich spannend finde, einsammeln, per Claude auf Relevanz
   triagieren und Kommentar-Entwürfe in meinem Stil vorbereiten.
2. **Stilprofil:** Mein eigener Schreibstil als editierbares Profil (mehrere möglich, z.B. DE/EN),
   abgeleitet aus echten Textproben plus eigenen Regeln und No-Gos.
3. **Content-Pipeline:** Aus Themen, die mich gerade beschäftigen, Post-Ideen und fertige Entwürfe
   generieren — mit Refine-Schleife (Feedback → neue Version), bevor irgendetwas rausgeht.
4. **Publishing + Analytics:** Freigegebene Inhalte auf LinkedIn veröffentlichen (human in the loop)
   und die Performance der eigenen Posts (Impressions, Reaktionen, Kommentare) im Dashboard sehen.

**Grundprinzip: Human in the loop.** Nichts geht ohne explizite Freigabe an LinkedIn. Die Engine
bereitet vor, ich entscheide.

## 2. Ausgangslage: die Referenz-Implementierung (ZIP)

Das ZIP von heute ist eine funktionierende Next.js-App (~1.300 Zeilen, Next 15 + Drizzle + Postgres
+ Anthropic SDK), die **Feature 1 und 2 bereits vollständig abdeckt**:

| Baustein | Status im ZIP |
|---|---|
| Watchlist mit "Warum relevant?"-Notizen | ✅ fertig |
| Browser-Collector (Tampermonkey-Userscript, liest Feed/Profil-DOM) | ✅ fertig |
| Claude-Triage (Relevanz-Score 0–100, Mehrheit fällt durch — Absicht) | ✅ fertig |
| Kommentar-Entwürfe: 3 Varianten mit unterschiedlichen Stoßrichtungen | ✅ fertig |
| Stilprofile (Samples → abgeleitete Analyse, Regeln/No-Gos haben Vorrang) | ✅ fertig |
| Platzhalter-Guard: `[[…]]` blockiert Freigabe, verhindert erfundene Zahlen | ✅ fertig |
| Outbox: Kommentar wird in die LinkedIn-Box **eingefügt**, abgeschickt wird manuell | ✅ fertig |
| Content-Pipeline für eigene Posts | ❌ fehlt |
| Publishing eigener Posts | ❌ fehlt |
| Analytics | ❌ fehlt |
| Railway-Deployment (railway.json, drizzle-kit push beim Start) | ✅ vorbereitet |

Die Architektur ist bewusst gewählt: **kein Headless-Browser, keine gespeicherten
LinkedIn-Credentials.** Der Collector liest nur, was im eigenen eingeloggten Browser ohnehin auf
dem Bildschirm steht, und fügt Text in Eingabefelder ein — abgeschickt wird per Hand.

**Entscheidung: Wir bauen auf diesem Code auf statt neu zu starten.** Er ist klein, sauber
strukturiert, und die fehlenden Features passen in das vorhandene Datenmodell.

## 3. Wichtige Randbedingungen (ehrlich)

- **LinkedIn-API:** Ohne Partner-Freigabe selbst nutzbar sind nur OIDC-Login und
  `w_member_social` — d.h. **eigene Posts/Kommentare veröffentlichen geht offiziell**.
  Fremde Posts lesen, Feed-Zugriff und Post-Analytics brauchen die Community Management API
  (Freigabeprozess durch LinkedIn, für Einzelpersonen praktisch unerreichbar).
- **Konsequenz:** Lesen (fremde Posts, eigene Analytics) läuft über den Browser-Collector;
  Schreiben (eigene Posts) kann optional über die offizielle API laufen.
- **ToS-Grauzone:** Automatisiertes Auslesen widerspricht formal den LinkedIn-Nutzungsbedingungen.
  Das Setup bleibt bewusst nah am manuellen Verhalten (eigener Browser, eigene Session, eigenes
  Scrollen, eigener Klick). Tempo menschlich halten, keine Massenaktionen.
- **DOM-Brüchigkeit:** LinkedIn ändert sein Markup regelmäßig. Alle Selektoren liegen gesammelt
  im `SEL`-Block des Userscripts — eine Stelle zum Reparieren.
- **Single-User:** Passwort-Login reicht; kein Mandanten-System nötig.

## 4. Phasenplan

### Phase 0 — Fundament & Deployment (Tag 1)
Referenzcode ins Repo übernehmen und live bringen.

- ZIP-Code als Basis in dieses Repo committen (ohne dessen `.git`-Historie).
- Railway-Projekt: Service aus GitHub-Repo + Postgres, Variablen setzen
  (`ANTHROPIC_API_KEY`, `APP_PASSWORD`, `COLLECTOR_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`).
- Tampermonkey-Userscript im Browser installieren, `/setup`-Flow durchlaufen.
- **Abnahme:** Ein echter Post aus dem eigenen Feed landet in der App, wird triagiert,
  bekommt 3 Kommentar-Varianten, und ein freigegebener Kommentar lässt sich auf LinkedIn einfügen.

### Phase 1 — Stilprofil kalibrieren (Tag 1–2, parallel)
Das Feature existiert; die Qualität entsteht durch Fütterung.

- 8–15 eigene Posts/Kommentare als Samples einpflegen (`---` als Trenner), Analyse ableiten lassen.
- Eigene Regeln und No-Gos formulieren (schlagen die Analyse — härtester Hebel).
- Zwei Profile anlegen: Deutsch und Englisch.
- **Abnahme:** Blindtest — 5 generierte Kommentare, davon würde ich mindestens 3 fast unverändert
  abschicken.

### Phase 2 — Content-Pipeline für eigene Posts (Woche 1–2)
Das größte neue Stück. Neue Tabellen `topics` und `postDrafts`, neue Seite „Pipeline".

- **Themenspeicher:** Themen anlegen (Titel, Kontext/Meinung, Zielgruppe, Priorität).
  Optional: eingesammelte fremde Posts als Inspiration an ein Thema hängen.
- **Ideation:** Claude schlägt pro Thema 3–5 Post-Angles vor (Hook, Kernaussage, Format —
  z.B. steile These / persönliche Story / Zahlenargument).
- **Drafting:** Aus einem gewählten Angle einen vollständigen Post im eigenen Stilprofil
  generieren. Platzhalter-Guard `[[…]]` gilt auch hier.
- **Refine-Schleife:** Feedback als Text → neue Version, Versionshistorie bleibt sichtbar.
  Status: `idea → drafted → refined → approved → posted`.
- **Abnahme:** Von Thema bis freigegebenem Post komplett in der App, mindestens ein Post
  tatsächlich veröffentlicht.

### Phase 3 — Publishing (Woche 2)
Zwei Wege, beide human-in-the-loop:

- **Weg A (Start, sofort verfügbar):** Outbox-Muster wie bei Kommentaren — das Userscript füllt
  den LinkedIn-Post-Composer mit dem freigegebenen Text, abgeschickt wird manuell,
  danach „Als gepostet markieren" (inkl. Post-URL erfassen für Analytics).
- **Weg B (Ausbau, optional):** Offizielle LinkedIn-API mit OIDC + `w_member_social`.
  „Jetzt veröffentlichen"-Button in der App, der erst nach Freigabe aktiv ist. Vorteil: kein
  Copy/Paste, ToS-konform für eigene Posts. Aufwand: LinkedIn-Developer-App + OAuth-Flow (~1 Tag).
- **Abnahme:** Freigegebener Post aus der Pipeline steht auf LinkedIn, App kennt die Post-URL.

### Phase 4 — Analytics (Woche 3)
Da die offizielle Analytics-API nicht zugänglich ist: Collector-Ansatz.

- Userscript um einen Modus erweitern, der auf der eigenen `recent-activity`-Seite bzw. den
  eigenen Post-Detailseiten Impressions, Reaktionen und Kommentare ausliest und an
  `/api/analytics/ingest` schickt (Zeitreihe: `postMetrics`-Tabelle mit Snapshots).
- Dashboard-Seite: Verlauf pro Post, Vergleich der Posts untereinander, einfache Erkenntnisse
  (welches Format/Thema performt — als Claude-Auswertung über die Zeitreihen).
- Rückkopplung: Performance-Daten fließen als Kontext in die Ideation von Phase 2 ein
  („Posts mit X liefen gut").
- **Abnahme:** Nach 2 Wochen Nutzung zeigt das Dashboard belastbare Verläufe für alle eigenen Posts.

### Phase 5 — Feinschliff (laufend)
- Prompt-Tuning in `src/lib/prompts.ts` — laut Referenz-README der wichtigste Qualitätshebel.
- Feedback aus abgelehnten/editierten Entwürfen periodisch ins Stilprofil zurückspielen.
- Selektor-Wartung, wenn LinkedIn das Markup ändert.

## 5. Architektur (Zielbild)

```
Browser (dein LinkedIn-Login)          Railway                          Anthropic
┌─────────────────────────┐       ┌─────────────────────┐          ┌──────────────┐
│ Tampermonkey-Userscript │ingest │ Next.js 15 + API    │ prompts  │ Claude       │
│ · sammelt fremde Posts  ├──────►│ Postgres (Drizzle)  ├─────────►│ · Triage     │
│ · sammelt eigene Metriken│      │ · Watchlist/Posts   │          │ · Kommentare │
│ · füllt Kommentar/Post- │◄──────┤ · Stilprofile       │◄─────────┤ · Ideation   │
│   Composer (du schickst)│outbox │ · Topics/PostDrafts │          │ · Analytics- │
└─────────────────────────┘       │ · PostMetrics       │          │   Insights   │
        (optional Weg B)          │ · Review-UI         │          └──────────────┘
        LinkedIn API ◄────────────┤   (Passwort-Login)  │
        w_member_social: eigene   └─────────────────────┘
        Posts veröffentlichen
```

## 6. Risiken

| Risiko | Wahrscheinlichkeit | Umgang |
|---|---|---|
| LinkedIn ändert DOM, Collector bricht | hoch, regelmäßig | Selektoren zentral im `SEL`-Block; einkalkulierte Wartung |
| ToS-Grauzone beim Auslesen | akzeptiert | menschliches Tempo, eigener Browser, kein Headless, kein Massenbetrieb |
| Kommentar-Qualität enttäuscht | mittel | Qualität hängt an Watchlist-Notizen + Prompts, nicht am Modell; Phase 1 ernst nehmen |
| LinkedIn-OAuth (Weg B) zäher als gedacht | mittel | Weg A funktioniert unabhängig davon vollständig |
| API-Kosten | niedrig | Triage filtert vor; Sonnet als Default-Modell |

## 7. Nächste Schritte (konkret)

1. Referenzcode ins Repo übernehmen und pushen.
2. Railway-Projekt aufsetzen (Service + Postgres + Variablen) und deployen.
3. Userscript installieren, ersten Collect-Lauf machen.
4. Stilprofil mit echten Samples füttern.
5. Danach: Phase 2 (Content-Pipeline) als erstes neues Feature bauen.
