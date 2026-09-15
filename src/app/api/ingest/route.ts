import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts, watchTargets } from "@/lib/schema";
import { requireUserOrCollector } from "@/lib/guard";
import { eq, inArray } from "drizzle-orm";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

type Incoming = {
  urn: string; url?: string; authorName: string; authorUrl?: string; authorHeadline?: string;
  text: string; postedAtText?: string; reactions?: number; comments?: number; source?: string;
};

const normUrl = (u: string) => (u || "").trim().split("?")[0].replace(/\/$/, "").toLowerCase();

export async function POST(req: NextRequest) {
  const g = await requireUserOrCollector(req);
  if (g) return g;

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.posts)) return NextResponse.json({ error: "posts[] erwartet" }, { status: 400 });

  const onlyWatched = body.onlyWatched !== false;
  const incoming: Incoming[] = body.posts;

  const targets = await db.select().from(watchTargets).where(eq(watchTargets.active, true));
  const byUrl = new Map(targets.map((t) => [normUrl(t.profileUrl), t]));

  let created = 0, duplicates = 0, skippedUnwatched = 0;
  const touched = new Set<string>();

  for (const p of incoming) {
    if (!p?.urn || !p?.text || p.text.trim().length < 40) continue;
    const target = byUrl.get(normUrl(p.authorUrl || ""));
    if (onlyWatched && !target) { skippedUnwatched++; continue; }

    const [existing] = await db
      .select({ id: capturedPosts.id })
      .from(capturedPosts)
      .where(eq(capturedPosts.urn, p.urn))
      .limit(1);

    if (existing) {
      // Bekannter Post: nur Engagement-Zahlen nachziehen, Triage und Status nicht anfassen.
      await db
        .update(capturedPosts)
        .set({ reactions: Number(p.reactions || 0), comments: Number(p.comments || 0) })
        .where(eq(capturedPosts.id, existing.id));
      duplicates++;
    } else {
      await db.insert(capturedPosts).values({
        urn: p.urn,
        url: p.url || "",
        authorName: p.authorName || "Unbekannt",
        authorUrl: p.authorUrl || "",
        authorHeadline: p.authorHeadline || "",
        text: p.text.trim(),
        postedAtText: p.postedAtText || "",
        reactions: Number(p.reactions || 0),
        comments: Number(p.comments || 0),
        source: p.source || "feed",
        targetId: target?.id ?? null,
      });
      created++;
    }
    if (target) touched.add(target.id);
  }

  if (touched.size) {
    await db.update(watchTargets).set({ lastSeenAt: new Date() }).where(inArray(watchTargets.id, [...touched]));
  }

  return NextResponse.json({ ok: true, created, duplicates, skippedUnwatched, received: incoming.length });
}
