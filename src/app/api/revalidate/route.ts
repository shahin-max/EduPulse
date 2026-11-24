import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/api";

/** Who may ask for a refresh: admins (website content, any teacher's photo or profile) and faculty (their own). */
const ALLOWED_ROLES = ["ADMIN", "BRANCH_ADMIN", "FACULTY"];

/**
 * POST /api/revalidate: the portals call this after saving website content or a teacher's photo or
 * profile, so the public pages show the change on their next visit instead of after the 5-minute
 * cache. Only a staff access token is accepted; the API checks it (GET /auth/me), so no shared
 * secret is needed. It only empties the cache, so it cannot change what the pages show.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return NextResponse.json({ message: "Log in as an admin" }, { status: 401 });
  let roles: string[] = [];
  try {
    const me = await fetch(`${API_URL}/auth/me`, { headers: { authorization }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!me.ok) return NextResponse.json({ message: "Log in as an admin" }, { status: 401 });
    const body = await me.json() as { roles?: unknown };
    roles = Array.isArray(body.roles) ? body.roles.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return NextResponse.json({ message: "Could not reach the API" }, { status: 502 });
  }
  if (!roles.some(r => ALLOWED_ROLES.includes(r))) return NextResponse.json({ message: "Staff only" }, { status: 403 });
  // Every public page reads site-wide content in the root layout, so refresh them all.
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true });
}
