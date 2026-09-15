import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { styleProfiles } from "@/lib/schema";
import { requireUser, bad } from "@/lib/guard";
import { structured } from "@/lib/claude";
import { STYLE_DERIVE_SYSTEM, STYLE_TOOL, styleDeriveUser } from "@/lib/prompts";
import type { StyleDerived } from "@/lib/types";
import { eq } from "drizzle-orm";

export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (g) return g;
  const { id } = await ctx.params;
  const [profile] = await db.select().from(styleProfiles).where(eq(styleProfiles.id, id)).limit(1);
  if (!profile) return bad("Profil nicht gefunden", 404);
  if (profile.samples.trim().length < 200) {
    return bad("Zu wenig Material. Füge mindestens ein paar hundert Zeichen eigener Texte ein.");
  }

  const derived = await structured<StyleDerived>({
    system: STYLE_DERIVE_SYSTEM,
    user: styleDeriveUser(profile.samples, profile.rules, profile.doNots),
    tool: STYLE_TOOL,
    maxTokens: 3000,
    temperature: 0.3,
  });

  const [updated] = await db
    .update(styleProfiles)
    .set({ derived, derivedAt: new Date() })
    .where(eq(styleProfiles.id, id))
    .returning();

  return NextResponse.json({ profile: updated });
}
