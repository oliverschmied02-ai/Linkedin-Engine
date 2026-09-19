import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commentDrafts } from "@/lib/schema";
import { requireUserOrCollector } from "@/lib/guard";
import { and, asc, eq, gte, sql } from "drizzle-orm";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Freigegebene Kommentare — Browser-Collector und Publish-Workflow holen sie sich hier ab.
 * DAILY_LIMIT (Default 10) begrenzt, wie viele Kommentare pro Tag rausgehen dürfen —
 * der wichtigste Schutz gegen LinkedIn-Rate-Limits. Nicht hochdrehen.
 */
export async function GET(req: NextRequest) {
  const g = await requireUserOrCollector(req);
  if (g) return g;

  const dailyLimit = Math.max(1, Number(process.env.DAILY_LIMIT || 10));
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [{ postedToday }] = await db
    .select({ postedToday: sql<number>`cast(count(*) as int)` })
    .from(commentDrafts)
    .where(and(eq(commentDrafts.status, "posted"), gte(commentDrafts.postedAt, startOfDay)));
  const remaining = Math.max(0, dailyLimit - postedToday);

  const drafts = await db.query.commentDrafts.findMany({
    where: eq(commentDrafts.status, "approved"),
    orderBy: asc(commentDrafts.approvedAt),
    limit: remaining,
    with: { post: true },
  });
  return NextResponse.json({
    dailyLimit,
    postedToday,
    drafts: drafts.map((d) => ({
      id: d.id,
      urn: d.post.urn,
      url: d.post.url,
      authorName: d.post.authorName,
      postPreview: d.post.text.slice(0, 180),
      text: d.finalText,
    })),
  });
}
