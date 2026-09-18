import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchTargets } from "@/lib/schema";
import { requireUserOrCollector, bad } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { ENRICH_SYSTEM, ENRICH_TOOL, enrichUser } from "@/lib/prompts";
import { eq, sql } from "drizzle-orm";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

const normUrl = (u: string) => (u || "").trim().split("?")[0].replace(/\/$/, "").toLowerCase();

/**
 * Nimmt vom Browser ausgelesene Profildaten entgegen, legt die Person bei Bedarf an,
 * speichert Follower/About und lässt das LLM eine Kurzbeschreibung schreiben.
 */
export async function POST(req: NextRequest) {
  const g = await requireUserOrCollector(req);
  if (g) return g;

  const body = await req.json().catch(() => null);
  const profileUrl = normUrl(String(body?.profileUrl || ""));
  if (!profileUrl.includes("/in/")) return bad("profileUrl (…/in/…) erwartet");

  const name = String(body?.name || "").trim();
  const headline = String(body?.headline || "").trim();
  const about = String(body?.about || "").trim();
  const followers = Number.isFinite(Number(body?.followers)) && Number(body?.followers) > 0 ? Math.round(Number(body.followers)) : null;
  const recentPosts = String(body?.recentPosts || "").slice(0, 4000);

  const all = await db.select().from(watchTargets);
  let target = all.find((t) => normUrl(t.profileUrl) === profileUrl) || null;
  if (!target) {
    [target] = await db
      .insert(watchTargets)
      .values({ name: name || profileUrl.split("/in/")[1] || "Unbekannt", profileUrl, headline })
      .returning();
  }

  let summary = target.summary;
  if (about || headline || recentPosts) {
    try {
      const r = await structured<{ summary: string }>({
        task: "triage",
        system: ENRICH_SYSTEM,
        user: enrichUser({ name: name || target.name, headline: headline || target.headline, about, recentPosts }),
        tool: ENRICH_TOOL,
        maxTokens: 400,
        temperature: 0.3,
      });
      summary = r.summary?.trim() || summary;
    } catch (e) {
      // Anreicherung soll das Speichern der Rohdaten nie verhindern.
      console.error("Enrich-LLM fehlgeschlagen:", e);
    }
  }

  const [updated] = await db
    .update(watchTargets)
    .set({
      ...(name ? { name } : {}),
      ...(headline ? { headline } : {}),
      ...(about ? { about } : {}),
      ...(followers !== null ? { followers } : {}),
      summary,
      enrichedAt: sql`now()`,
    })
    .where(eq(watchTargets.id, target.id))
    .returning();

  return NextResponse.json({ target: updated });
}
