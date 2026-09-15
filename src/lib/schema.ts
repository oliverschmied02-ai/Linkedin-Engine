import { pgTable, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { randomUUID } from "crypto";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());

/** Dein Schreibstil — pro Sprache und/oder Kontext. */
export const styleProfiles = pgTable("style_profiles", {
  id: id(),
  name: text("name").notNull(),
  language: text("language").notNull().default("de"),
  isDefault: boolean("is_default").notNull().default(false),
  /// Regeln, die du selbst pflegst — härtestes Steuerungsmittel, schlagen die Analyse.
  rules: text("rules").notNull().default(""),
  doNots: text("do_nots").notNull().default(""),
  /// Rohe Textproben (eigene Posts/Kommentare)
  samples: text("samples").notNull().default(""),
  /// Von Claude abgeleitete Stilanalyse
  derived: jsonb("derived"),
  derivedAt: timestamp("derived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Personen, deren Posts du beobachtest. */
export const watchTargets = pgTable("watch_targets", {
  id: id(),
  name: text("name").notNull(),
  profileUrl: text("profile_url").notNull().unique(),
  headline: text("headline").notNull().default(""),
  /// Warum relevant — fließt in Triage und Kommentar-Generierung ein.
  notes: text("notes").notNull().default(""),
  priority: integer("priority").notNull().default(2),
  active: boolean("active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Ein eingesammelter LinkedIn-Post. */
export const capturedPosts = pgTable(
  "captured_posts",
  {
    id: id(),
    urn: text("urn").notNull().unique(),
    url: text("url").notNull().default(""),
    authorName: text("author_name").notNull(),
    authorUrl: text("author_url").notNull().default(""),
    authorHeadline: text("author_headline").notNull().default(""),
    text: text("text").notNull(),
    language: text("language").notNull().default(""),
    postedAtText: text("posted_at_text").notNull().default(""),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull().default("feed"),
    reactions: integer("reactions").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    /// Relevanz-Score 0-100 aus der Triage
    relevance: integer("relevance"),
    relevanceWhy: text("relevance_why").notNull().default(""),
    /// new | triaged | drafted | done | ignored
    status: text("status").notNull().default("new"),
    targetId: text("target_id").references(() => watchTargets.id, { onDelete: "set null" }),
  },
  (t) => [index("captured_posts_status_idx").on(t.status, t.capturedAt)]
);

/** Kommentar-Entwurf. Human in the loop: du wählst, editierst, gibst frei. */
export const commentDrafts = pgTable(
  "comment_drafts",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => capturedPosts.id, { onDelete: "cascade" }),
    styleProfileId: text("style_profile_id").references(() => styleProfiles.id, { onDelete: "set null" }),
    language: text("language").notNull().default("de"),
    /// [{ angle, text, rationale, risk }]
    variants: jsonb("variants").notNull(),
    chosenIndex: integer("chosen_index"),
    finalText: text("final_text").notNull().default(""),
    /// draft | approved | posted | skipped
    status: text("status").notNull().default("draft"),
    /// Dein Feedback — Futter fürs Stilprofil
    feedback: text("feedback").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
  },
  (t) => [index("comment_drafts_status_idx").on(t.status, t.createdAt)]
);

export const watchTargetsRelations = relations(watchTargets, ({ many }) => ({
  posts: many(capturedPosts),
}));

export const capturedPostsRelations = relations(capturedPosts, ({ one, many }) => ({
  target: one(watchTargets, { fields: [capturedPosts.targetId], references: [watchTargets.id] }),
  drafts: many(commentDrafts),
}));

export const commentDraftsRelations = relations(commentDrafts, ({ one }) => ({
  post: one(capturedPosts, { fields: [commentDrafts.postId], references: [capturedPosts.id] }),
  styleProfile: one(styleProfiles, { fields: [commentDrafts.styleProfileId], references: [styleProfiles.id] }),
}));

export const styleProfilesRelations = relations(styleProfiles, ({ many }) => ({
  drafts: many(commentDrafts),
}));
