import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts, commentDrafts } from "@/lib/schema";
import { requireUserOrCollector } from "@/lib/guard";
import { eq } from "drizzle-orm";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUserOrCollector(req);
  if (g) return g;
  const { id } = await ctx.params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("chosenIndex" in body) data.chosenIndex = body.chosenIndex === null ? null : Number(body.chosenIndex);
  if ("finalText" in body) data.finalText = String(body.finalText ?? "");
  if ("feedback" in body) data.feedback = String(body.feedback ?? "");
  if (body.status) {
    data.status = String(body.status);
    if (body.status === "approved") data.approvedAt = new Date();
    if (body.status === "posted") data.postedAt = new Date();
  }

  const [draft] = await db.update(commentDrafts).set(data).where(eq(commentDrafts.id, id)).returning();
  if (!draft) return NextResponse.json({ error: "Entwurf nicht gefunden" }, { status: 404 });

  if (body.status === "posted") {
    await db.update(capturedPosts).set({ status: "done" }).where(eq(capturedPosts.id, draft.postId));
  }
  if (body.status === "skipped") {
    await db.update(capturedPosts).set({ status: "ignored" }).where(eq(capturedPosts.id, draft.postId));
  }
  return NextResponse.json({ draft });
}
