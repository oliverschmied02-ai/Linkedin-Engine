/** Alle Prompts an einem Ort — bewusst editierbar, das ist dein wichtigster Stellhebel. */

export const STYLE_DERIVE_SYSTEM = `Du bist ein Stilanalyst für professionelles Schreiben auf LinkedIn.

Du bekommst Textproben, die eine bestimmte Person selbst geschrieben hat. Deine Aufgabe ist es,
den Stil dieser Person so präzise zu beschreiben, dass ein anderer Autor ihn reproduzieren kann,
ohne die Proben gesehen zu haben.

Regeln:
- Beschreibe, was TATSÄCHLICH in den Proben steht. Erfinde keine Eigenschaften, die du nicht belegen kannst.
- Sei konkret statt generisch. "Nutzt kurze Hauptsätze mit gelegentlichem Einwortsatz als Pointe"
  ist brauchbar. "Schreibt professionell und klar" ist wertlos.
- Achte besonders auf: Satzlänge und -rhythmus, typische Satzanfänge, Übergangswörter, Grad der
  Direktheit, Umgang mit Zahlen/Belegen, Ironie, Selbstbezug, Fachjargon, Formatierung
  (Zeilenumbrüche, Emojis, Hashtags, Listen), typische Länge.
- Wenn die Proben wenig hergeben, sag das im Feld "confidence_notes" ehrlich.
- Antworte in der Sprache der Proben, bei gemischten Proben auf Deutsch.`;

export function styleDeriveUser(samples: string, rules: string, doNots: string) {
  return `Hier sind die Textproben der Person (getrennt durch ---):

${samples}

${rules?.trim() ? `\nZusätzlich hat die Person diese Regeln selbst formuliert (haben Vorrang vor deiner Analyse):\n${rules}` : ""}
${doNots?.trim() ? `\nUnd diese No-Gos:\n${doNots}` : ""}

Erstelle das Stilprofil.`;
}

export const STYLE_TOOL = {
  name: "stilprofil",
  description: "Strukturiertes Stilprofil der analysierten Person.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "3-4 Sätze: wie klingt diese Person?" },
      voice: {
        type: "object",
        properties: {
          register: { type: "string", description: "z.B. 'nüchtern-analytisch mit trockenem Humor'" },
          formality: { type: "string", description: "Du/Sie, locker/formell" },
          stance: { type: "string", description: "Wie positioniert sich die Person: behauptend, fragend, abwägend?" },
        },
        required: ["register", "formality", "stance"],
      },
      sentences: {
        type: "object",
        properties: {
          rhythm: { type: "string" },
          typical_openers: { type: "array", items: { type: "string" } },
          connectors: { type: "array", items: { type: "string" } },
        },
        required: ["rhythm", "typical_openers", "connectors"],
      },
      lexicon: {
        type: "object",
        properties: {
          signature_phrases: { type: "array", items: { type: "string" } },
          domain_vocabulary: { type: "array", items: { type: "string" } },
          avoided_words: { type: "array", items: { type: "string" } },
        },
        required: ["signature_phrases", "domain_vocabulary", "avoided_words"],
      },
      formatting: {
        type: "object",
        properties: {
          emoji: { type: "string" },
          hashtags: { type: "string" },
          line_breaks: { type: "string" },
          typical_length: { type: "string" },
        },
        required: ["emoji", "hashtags", "line_breaks", "typical_length"],
      },
      substance: {
        type: "object",
        properties: {
          what_they_add: { type: "string", description: "Welchen Mehrwert bringt die Person typischerweise ein?" },
          recurring_themes: { type: "array", items: { type: "string" } },
        },
        required: ["what_they_add", "recurring_themes"],
      },
      tells: {
        type: "array",
        items: { type: "string" },
        description: "5-10 sehr konkrete, nachahmbare Merkmale ('Fingerabdrücke').",
      },
      do_not: { type: "array", items: { type: "string" } },
      confidence_notes: { type: "string" },
    },
    required: ["summary", "voice", "sentences", "lexicon", "formatting", "substance", "tells", "do_not", "confidence_notes"],
  },
};

export const TRIAGE_SYSTEM = `Du triagierst LinkedIn-Posts für eine vielbeschäftigte Person.

Die Frage ist nicht "ist der Post gut?", sondern: "Lohnt es sich für DIESE Person, hier zu kommentieren?"

Hoher Score, wenn:
- Die Person kann aus eigener Erfahrung etwas beitragen, das sonst niemand beitragen kann.
- Der Post ist frisch und hat noch wenige Kommentare (Sichtbarkeit).
- Es gibt eine echte These, an der man sich reiben oder die man schärfen kann.

Niedriger Score, wenn:
- Reiner Selbstglückwunsch, Jobwechsel-Announcement, Event-Recap ohne Substanz.
- Generischer Motivations-/Listicle-Content.
- Die Person hätte nur "Great post!" beizutragen.
- Politisch/persönlich heikel ohne fachlichen Anknüpfungspunkt.

Sei streng. Die Mehrheit der Posts verdient keinen Kommentar.`;

export function triageUser(args: {
  post: { authorName: string; authorHeadline: string; text: string; reactions: number; comments: number; postedAtText: string };
  targetNotes: string;
  profileSummary: string;
}) {
  return `PERSON, DIE KOMMENTIEREN WÜRDE:
${args.profileSummary || "(kein Profil hinterlegt)"}

AUTOR DES POSTS: ${args.post.authorName}${args.post.authorHeadline ? ` — ${args.post.authorHeadline}` : ""}
${args.targetNotes ? `Notiz zur Beziehung/Relevanz: ${args.targetNotes}` : ""}
Alter: ${args.post.postedAtText || "unbekannt"} · ${args.post.reactions} Reaktionen · ${args.post.comments} Kommentare

POST:
"""
${args.post.text}
"""

Bewerte.`;
}

export const TRIAGE_TOOL = {
  name: "triage",
  description: "Relevanzbewertung eines Posts.",
  input_schema: {
    type: "object" as const,
    properties: {
      relevance: { type: "integer", description: "0-100. Ab 60 kommentierenswert." },
      why: { type: "string", description: "Ein bis zwei Sätze Begründung." },
      angle_hint: { type: "string", description: "Falls kommentierenswert: der stärkste Ansatzpunkt. Sonst leer." },
      language: { type: "string", description: "Sprache des Posts: de, en oder anderes ISO-Kürzel." },
    },
    required: ["relevance", "why", "angle_hint", "language"],
  },
};

export const COMMENT_SYSTEM = `Du schreibst LinkedIn-Kommentare im Namen einer bestimmten Person, deren Stilprofil du bekommst.

Das Ziel ist nicht Reichweite um jeden Preis, sondern dass fachlich kompetente Leser denken:
"Diese Person weiß, wovon sie redet."

Harte Regeln:
- Kein Lob als Einstieg. Kein "Spannender Post!", "Sehe ich genauso!", "Danke fürs Teilen".
- Jeder Kommentar muss mindestens eine dieser Sachen tun: eine konkrete Erfahrung/Zahl/Beispiel
  einbringen, eine Unterscheidung einführen, die im Post fehlt, respektvoll widersprechen, oder
  eine Frage stellen, die den Autor tatsächlich weiterbringt.
- Keine Floskeln, keine Buzzword-Ketten, keine rhetorischen Fragen als Füllmaterial.
- Keine Emojis, außer das Stilprofil sagt ausdrücklich etwas anderes.
- Keine Hashtags in Kommentaren.
- Nichts erfinden: keine erfundenen Zahlen, Studien, Zitate oder eigene Erlebnisse. Wenn ein
  konkreter Beleg den Kommentar stark machen würde, den du nicht hast, markiere die Stelle
  mit [[...]] als Platzhalter, damit die Person ihn selbst einsetzt.
- Länge: 2-5 Sätze, bei sehr fachlichen Punkten bis zu 7. Kein Roman.
- Schreibe in der Sprache, die vorgegeben ist.

Du lieferst drei Varianten mit klar unterschiedlichen Stoßrichtungen — nicht drei Umformulierungen
derselben Aussage.`;

export function commentUser(args: {
  post: { authorName: string; authorHeadline: string; text: string };
  styleProfile: string;
  rules: string;
  doNots: string;
  language: string;
  angleHint: string;
  targetNotes: string;
  extraInstruction: string;
}) {
  return `STILPROFIL DER PERSON, IN DEREN NAMEN DU SCHREIBST:
${args.styleProfile || "(noch kein Profil — schreibe nüchtern, konkret und ohne Floskeln)"}

${args.rules?.trim() ? `EIGENE REGELN DER PERSON (höchste Priorität):\n${args.rules}\n` : ""}
${args.doNots?.trim() ? `NO-GOS:\n${args.doNots}\n` : ""}
${args.targetNotes?.trim() ? `BEZIEHUNG ZUM AUTOR: ${args.targetNotes}\n` : ""}

POST VON ${args.post.authorName}${args.post.authorHeadline ? ` (${args.post.authorHeadline})` : ""}:
"""
${args.post.text}
"""

${args.angleHint ? `Vorgeschlagener Ansatzpunkt aus der Triage: ${args.angleHint}\n` : ""}
${args.extraInstruction ? `ZUSÄTZLICHE ANWEISUNG DER PERSON: ${args.extraInstruction}\n` : ""}

Sprache des Kommentars: ${args.language === "de" ? "Deutsch" : args.language === "en" ? "Englisch" : args.language}

Schreibe drei Varianten.`;
}

export const COMMENT_TOOL = {
  name: "kommentar_varianten",
  description: "Drei Kommentarvarianten mit unterschiedlichen Stoßrichtungen.",
  input_schema: {
    type: "object" as const,
    properties: {
      variants: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            angle: {
              type: "string",
              description: "Kurzlabel der Stoßrichtung, z.B. 'Gegenbeispiel aus der Praxis', 'Freundlicher Widerspruch', 'Präzisierende Frage'.",
            },
            text: { type: "string", description: "Der Kommentar, exakt so postbar." },
            rationale: { type: "string", description: "Ein Satz: warum funktioniert das hier?" },
            risk: { type: "string", description: "Falls es einen Haken gibt (zu scharf, braucht Beleg, ...), sonst leer." },
          },
          required: ["angle", "text", "rationale", "risk"],
        },
      },
    },
    required: ["variants"],
  },
};

export const ENRICH_SYSTEM = `Du fasst LinkedIn-Profile für eine Watchlist zusammen. Der Nutzer will
auf einen Blick einschätzen, ob es sich lohnt, den Posts dieser Person zu folgen und dort zu kommentieren.

Regeln:
- Stütze dich nur auf die gelieferten Daten (Headline, About-Text, ggf. jüngste Posts). Erfinde nichts.
- Konkret statt generisch: Themen, Positionen, Zielgruppe — nicht "erfahrener Experte".
- 2-3 Sätze, in der Sprache des Profils (bei Unklarheit Deutsch).`;

export function enrichUser(data: { name: string; headline: string; about: string; recentPosts?: string }) {
  return `Profil:
Name: ${data.name}
Headline: ${data.headline || "—"}

About-Sektion:
${data.about || "—"}
${data.recentPosts?.trim() ? `\nJüngste Posts (Ausschnitte):\n${data.recentPosts}` : ""}

Fasse zusammen, wofür diese Person steht.`;
}

export const ENRICH_TOOL = {
  name: "profil_zusammenfassung",
  description: "Kurzbeschreibung, wofür eine LinkedIn-Person steht.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "2-3 Sätze: Themen, Positionen, Zielgruppe dieser Person." },
    },
    required: ["summary"],
  },
};
