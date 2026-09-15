import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts, commentDrafts } from "@/lib/schema";
import { requireUser } from "@/lib/guard";
import { and, desc, eq, gte, notInArray, sql, type SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const g = await requireUser();
  if (g) return g;
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const minRelevance = Number(sp.get("minRelevance") || 0);
  const take = Math.min(Number(sp.get("take") || 50), 200);

  const filters: SQL[] = [];
  if (status && status !== "all") filters.push(eq(capturedPosts.status, status));
  else if (status !== "all") filters.push(notInArray(capturedPosts.status, ["ignored", "done"]));
  if (minRelevance > 0) filters.push(gte(capturedPosts.relevance, minRelevance));

  const posts = await db.query.capturedPosts.findMany({
    where: filters.length ? and(...filters) : undefined,
    orderBy: [sql`${capturedPosts.relevance} desc nulls last`, desc(capturedPosts.capturedAt)],
    limit: take,
    with: { target: true, drafts: { orderBy: desc(commentDrafts.createdAt) } },
  });

  const counts = await db
    .select({ status: capturedPosts.status, n: sql<number>`cast(count(*) as int)` })
    .from(capturedPosts)
    .groupBy(capturedPosts.status);

  return NextResponse.json({ posts, counts });
}
