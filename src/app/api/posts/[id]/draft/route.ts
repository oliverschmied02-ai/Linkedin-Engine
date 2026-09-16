import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts, commentDrafts, styleProfiles } from "@/lib/schema";
import { requireUser, bad } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { COMMENT_SYSTEM, COMMENT_TOOL, commentUser } from "@/lib/prompts";
import { renderStyle } from "@/lib/types";
import type { CommentVariant, StyleDerived } from "@/lib/types";
import { eq } from "drizzle-orm";

export const maxDuration = 300;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const post = await db.query.capturedPosts.findFirst({
    where: eq(capturedPosts.id, id),
    with: { target: true },
  });
  if (!post) return bad("Post nicht gefunden", 404);

  const [style] = body.styleProfileId
    ? await db.select().from(styleProfiles).where(eq(styleProfiles.id, String(body.styleProfileId))).limit(1)
    : await db.select().from(styleProfiles).where(eq(styleProfiles.isDefault, true)).limit(1);

  // Sprache: explizite Wahl > erkannte Sprache des Posts > Profilsprache > Deutsch
  const language = String(body.language || post.language || style?.language || "de");

  const derived = (style?.derived as StyleDerived | null) ?? null;
  const angleHint = post.relevanceWhy.includes("Ansatz:") ? post.relevanceWhy.split("Ansatz:")[1].trim() : "";

  const result = await structured<{ variants: CommentVariant[] }>({
    system: COMMENT_SYSTEM,
    user: commentUser({
      post: { authorName: post.authorName, authorHeadline: post.authorHeadline, text: post.text },
      styleProfile: renderStyle(derived),
      rules: style?.rules || "",
      doNots: style?.doNots || "",
      language,
      angleHint,
      targetNotes: post.target?.notes || "",
      extraInstruction: String(body.instruction || ""),
    }),
    tool: COMMENT_TOOL,
    maxTokens: 2500,
    temperature: 0.9,
  });

  // Nur ein aktiver Entwurf pro Post: alte verwerfen.
  await db.delete(commentDrafts).where(eq(commentDrafts.postId, post.id));

  const [draft] = await db
    .insert(commentDrafts)
    .values({
      postId: post.id,
      styleProfileId: style?.id ?? null,
      language,
      variants: result.variants,
    })
    .returning();

  await db.update(capturedPosts).set({ status: "drafted" }).where(eq(capturedPosts.id, post.id));
  return NextResponse.json({ draft });
}
