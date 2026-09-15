import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturedPosts } from "@/lib/schema";
import { requireUser } from "@/lib/guard";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  const body = await req.json();
  if (!body.status) return NextResponse.json({ error: "status erwartet" }, { status: 400 });
  const [post] = await db
    .update(capturedPosts)
    .set({ status: String(body.status) })
    .where(eq(capturedPosts.id, id))
    .returning();
  return NextResponse.json({ post });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  await db.delete(capturedPosts).where(eq(capturedPosts.id, id));
  return NextResponse.json({ ok: true });
}
