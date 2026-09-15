import { NextRequest, NextResponse } from "next/server";
import { isLoggedIn, hasCollectorKey } from "./auth";

export async function requireUser() {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** Erlaubt Web-UI-Session ODER Collector-Key (für Aufrufe aus dem Userscript). */
export async function requireUserOrCollector(req: NextRequest) {
  if (hasCollectorKey(req)) return null;
  if (await isLoggedIn()) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
