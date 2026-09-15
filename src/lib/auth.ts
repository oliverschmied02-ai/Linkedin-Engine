import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const COOKIE = "le_session";

function secret() {
  return process.env.APP_PASSWORD || "dev-password";
}

export function makeToken() {
  return createHmac("sha256", secret()).update("linkedin-engine-v1").digest("hex");
}

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function isLoggedIn() {
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  return !!v && safeEq(v, makeToken());
}

export async function setSession() {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Der Browser-Collector authentifiziert sich per Shared Secret statt per Cookie. */
export function hasCollectorKey(req: NextRequest) {
  const key = req.headers.get("x-collector-key") || "";
  const expected = process.env.COLLECTOR_KEY || "";
  if (!expected) return false;
  return safeEq(key, expected);
}

export const SESSION_COOKIE = COOKIE;
