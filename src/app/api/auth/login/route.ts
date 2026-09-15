import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "APP_PASSWORD ist nicht gesetzt" }, { status: 500 });
  }
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}
