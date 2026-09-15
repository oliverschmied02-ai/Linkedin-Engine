import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { styleProfiles } from "@/lib/schema";
import { requireUser } from "@/lib/guard";
import { asc, desc, sql } from "drizzle-orm";

export async function GET() {
  const g = await requireUser();
  if (g) return g;
  const profiles = await db
    .select()
    .from(styleProfiles)
    .orderBy(desc(styleProfiles.isDefault), asc(styleProfiles.createdAt));
  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const g = await requireUser();
  if (g) return g;
  const body = await req.json();
  const [{ count }] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(styleProfiles);
  const [profile] = await db
    .insert(styleProfiles)
    .values({
      name: String(body.name || "Neues Profil"),
      language: String(body.language || "de"),
      rules: String(body.rules || ""),
      doNots: String(body.doNots || ""),
      samples: String(body.samples || ""),
      isDefault: count === 0,
    })
    .returning();
  return NextResponse.json({ profile });
}
