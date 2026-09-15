export type StyleDerived = {
  summary: string;
  voice: { register: string; formality: string; stance: string };
  sentences: { rhythm: string; typical_openers: string[]; connectors: string[] };
  lexicon: { signature_phrases: string[]; domain_vocabulary: string[]; avoided_words: string[] };
  formatting: { emoji: string; hashtags: string; line_breaks: string; typical_length: string };
  substance: { what_they_add: string; recurring_themes: string[] };
  tells: string[];
  do_not: string[];
  confidence_notes: string;
};

export type TriageResult = {
  relevance: number;
  why: string;
  angle_hint: string;
  language: string;
};

export type CommentVariant = {
  angle: string;
  text: string;
  rationale: string;
  risk: string;
};

/** Rendert das strukturierte Stilprofil als Prompt-Text. */
export function renderStyle(d: StyleDerived | null | undefined): string {
  if (!d) return "";
  const L = (a?: string[]) => (a && a.length ? a.join(" · ") : "—");
  return [
    `Zusammenfassung: ${d.summary}`,
    `Register: ${d.voice?.register} | Formalität: ${d.voice?.formality} | Haltung: ${d.voice?.stance}`,
    `Satzrhythmus: ${d.sentences?.rhythm}`,
    `Typische Satzanfänge: ${L(d.sentences?.typical_openers)}`,
    `Übergänge: ${L(d.sentences?.connectors)}`,
    `Signaturphrasen: ${L(d.lexicon?.signature_phrases)}`,
    `Fachvokabular: ${L(d.lexicon?.domain_vocabulary)}`,
    `Vermeidet: ${L(d.lexicon?.avoided_words)}`,
    `Formatierung: Emoji ${d.formatting?.emoji}; Hashtags ${d.formatting?.hashtags}; Umbrüche ${d.formatting?.line_breaks}; Länge ${d.formatting?.typical_length}`,
    `Mehrwert: ${d.substance?.what_they_add}`,
    `Themen: ${L(d.substance?.recurring_themes)}`,
    `Fingerabdrücke:\n${(d.tells || []).map((t) => `  - ${t}`).join("\n")}`,
    d.do_not?.length ? `Nie tun:\n${d.do_not.map((t) => `  - ${t}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
