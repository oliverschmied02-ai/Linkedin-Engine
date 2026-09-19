import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchTargets, capturedPosts } from "@/lib/schema";
import { requireUser, requireUserOrCollector, bad } from "@/lib/guard";
import { asc, desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // Auch für den Sammel-Workflow im Browser (x-collector-key) zugänglich.
  const g = await requireUserOrCollector(req);
  if (g) return g;
  const rows = await db
    .select({
      id: watchTargets.id,
      name: watchTargets.name,
      profileUrl: watchTargets.profileUrl,
      headline: watchTargets.headline,
      notes: watchTargets.notes,
      followers: watchTargets.followers,
      summary: watchTargets.summary,
      enrichedAt: watchTargets.enrichedAt,
      priority: watchTargets.priority,
      active: watchTargets.active,
      lastSeenAt: watchTargets.lastSeenAt,
      postCount: sql<number>`cast(count(${capturedPosts.id}) as int)`,
    })
    .from(watchTargets)
    .leftJoin(capturedPosts, eq(capturedPosts.targetId, watchTargets.id))
    .groupBy(watchTargets.id)
    .orderBy(desc(watchTargets.active), asc(watchTargets.priority), asc(watchTargets.name));

  return NextResponse.json({
    targets: rows.map((t) => ({
      ...t,
      activityUrl: t.profileUrl.replace(/\/$/, "") + "/recent-activity/all/",
      _count: { posts: t.postCount },
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await requireUser();
  if (g) return g;
  const body = await req.json();
  const profileUrl = String(body.profileUrl || "").trim().split("?")[0].replace(/\/$/, "");
  if (!profileUrl.includes("linkedin.com/in/")) return bad("Bitte eine linkedin.com/in/... URL angeben");

  const name = String(body.name || "").trim() || decodeURIComponent(profileUrl.split("/in/")[1] || "Unbekannt");
  const [target] = await db
    .insert(watchTargets)
    .values({
      profileUrl,
      name,
      headline: String(body.headline || ""),
      notes: String(body.notes || ""),
      priority: Number(body.priority ?? 2),
    })
    .onConflictDoUpdate({
      target: watchTargets.profileUrl,
      set: {
        name,
        headline: String(body.headline || ""),
        notes: String(body.notes || ""),
        priority: Number(body.priority ?? 2),
        active: body.active ?? true,
      },
    })
    .returning();

  return NextResponse.json({ target });
}
