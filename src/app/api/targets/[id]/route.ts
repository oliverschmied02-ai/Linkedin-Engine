import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchTargets } from "@/lib/schema";
import { requireUser } from "@/lib/guard";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "headline", "notes"] as const) if (k in body) data[k] = String(body[k] ?? "");
  if ("priority" in body) data.priority = Number(body.priority);
  if ("active" in body) data.active = Boolean(body.active);
  const [target] = await db.update(watchTargets).set(data).where(eq(watchTargets.id, id)).returning();
  return NextResponse.json({ target });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  await db.delete(watchTargets).where(eq(watchTargets.id, id));
  return NextResponse.json({ ok: true });
}
