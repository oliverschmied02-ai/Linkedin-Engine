import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts, styleProfiles } from "@/lib/schema";
import { requireUserOrCollector } from "@/lib/guard";
import { structured } from "@/lib/claude";
import { TRIAGE_SYSTEM, TRIAGE_TOOL, triageUser } from "@/lib/prompts";
import type { TriageResult, StyleDerived } from "@/lib/types";
import { and, desc, eq, isNull } from "drizzle-orm";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const g = await requireUserOrCollector(req);
  if (g) return g;
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Number(body.limit ?? 15), 40);

  const posts = await db.query.capturedPosts.findMany({
    where: and(eq(capturedPosts.status, "new"), isNull(capturedPosts.relevance)),
    orderBy: desc(capturedPosts.capturedAt),
    limit,
    with: { target: true },
  });
  if (!posts.length) return NextResponse.json({ ok: true, triaged: 0 });

  const [style] = await db.select().from(styleProfiles).where(eq(styleProfiles.isDefault, true)).limit(1);
  const summary = (style?.derived as StyleDerived | null)?.summary || style?.rules || "";

  let triaged = 0;
  for (const post of posts) {
    try {
      const r = await structured<TriageResult>({
        system: TRIAGE_SYSTEM,
        user: triageUser({
          post: {
            authorName: post.authorName,
            authorHeadline: post.authorHeadline,
            text: post.text,
            reactions: post.reactions,
            comments: post.comments,
            postedAtText: post.postedAtText,
          },
          targetNotes: post.target?.notes || "",
          profileSummary: summary,
        }),
        tool: TRIAGE_TOOL,
        maxTokens: 700,
        temperature: 0.2,
      });
      await db
        .update(capturedPosts)
        .set({
          relevance: Math.max(0, Math.min(100, Number(r.relevance) || 0)),
          relevanceWhy: [r.why, r.angle_hint ? `Ansatz: ${r.angle_hint}` : ""].filter(Boolean).join(" "),
          language: r.language || "",
          status: "triaged",
        })
        .where(eq(capturedPosts.id, post.id));
      triaged++;
    } catch (e) {
      await db
        .update(capturedPosts)
        .set({ status: "triaged", relevance: 0, relevanceWhy: `Triage fehlgeschlagen: ${String(e)}` })
        .where(eq(capturedPosts.id, post.id));
    }
  }
  return NextResponse.json({ ok: true, triaged });
}
