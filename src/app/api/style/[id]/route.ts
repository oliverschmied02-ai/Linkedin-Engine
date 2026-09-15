import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { styleProfiles } from "@/lib/schema";
import { requireUser } from "@/lib/guard";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "language", "rules", "doNots", "samples"] as const) {
    if (k in body) data[k] = String(body[k] ?? "");
  }
  if (body.isDefault === true) {
    await db.update(styleProfiles).set({ isDefault: false });
    data.isDefault = true;
  }
  const [profile] = await db.update(styleProfiles).set(data).where(eq(styleProfiles.id, id)).returning();
  return NextResponse.json({ profile });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  await db.delete(styleProfiles).where(eq(styleProfiles.id, id));
  return NextResponse.json({ ok: true });
}
