import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts } from "@/lib/schema";
import { requireUserOrCollector } from "@/lib/guard";
import { and, eq, like, sql } from "drizzle-orm";

/** Setzt Posts zurück, deren Triage am LLM gescheitert ist, damit sie erneut bewertet werden. */
export async function POST(req: NextRequest) {
  const g = await requireUserOrCollector(req);
  if (g) return g;
  const rows = await db
    .update(capturedPosts)
    .set({ status: "new", relevance: sql`NULL`, relevanceWhy: "" })
    .where(and(eq(capturedPosts.status, "triaged"), like(capturedPosts.relevanceWhy, "Triage fehlgeschlagen%")))
    .returning({ id: capturedPosts.id });
  return NextResponse.json({ ok: true, requeued: rows.length });
}
