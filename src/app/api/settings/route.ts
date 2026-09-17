import { NextRequest, NextResponse } from "next/server";
import { requireUser, bad } from "@/lib/guard";
import { getLlmSettings, setLlmSettings, llmDefaults } from "@/lib/settings";

export async function GET() {
  const g = await requireUser();
  if (g) return g;
  const settings = await getLlmSettings();
  return NextResponse.json({ settings, defaults: llmDefaults(), hasApiKey: Boolean(process.env.LLM_API_KEY) });
}

export async function PATCH(req: NextRequest) {
  const g = await requireUser();
  if (g) return g;
  const body = await req.json();
  const baseUrl = body.baseUrl !== undefined ? String(body.baseUrl) : undefined;
  if (baseUrl !== undefined && !/^https?:\/\//.test(baseUrl)) return bad("baseUrl muss mit http(s):// beginnen");
  await setLlmSettings({
    baseUrl,
    modelGenerate: body.modelGenerate !== undefined ? String(body.modelGenerate) : undefined,
    modelTriage: body.modelTriage !== undefined ? String(body.modelTriage) : undefined,
  });
  return NextResponse.json({ settings: await getLlmSettings() });
}
