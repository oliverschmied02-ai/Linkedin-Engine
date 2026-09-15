import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commentDrafts } from "@/lib/schema";
import { requireUserOrCollector } from "@/lib/guard";
import { asc, eq } from "drizzle-orm";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/** Freigegebene Kommentare — der Browser-Collector holt sie sich hier ab. */
export async function GET(req: NextRequest) {
  const g = await requireUserOrCollector(req);
  if (g) return g;
  const drafts = await db.query.commentDrafts.findMany({
    where: eq(commentDrafts.status, "approved"),
    orderBy: asc(commentDrafts.approvedAt),
    limit: 50,
    with: { post: true },
  });
  return NextResponse.json({
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
