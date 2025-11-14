// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* -------------------------------------------------------------------------- */
/*                               AUTH HELPER                                  */
/* -------------------------------------------------------------------------- */
async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/* -------------------------------------------------------------------------- */
/*                                GET SESSIONS                                */
/* -------------------------------------------------------------------------- */
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_sessions")
    .select(
      "id, device_name, user_agent, ip_address, created_at, last_active_at"
    )
    .eq("user_id", user.id)
    .order("last_active_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessions: data ?? [] });
}

/* -------------------------------------------------------------------------- */
/*                               REVOKE SESSION                               */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { session_id } = await req.json();
  if (!session_id)
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  // Delete specific session from DB
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .eq("id", session_id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Try to invalidate all refresh tokens (logout all devices)
  try {
    // Some older SDKs don’t have `invalidateUserRefreshTokens`
    const adminAuth: any = (supabase as any).auth?.admin;
    if (adminAuth?.invalidateUserRefreshTokens) {
      await adminAuth.invalidateUserRefreshTokens(user.id);
    } else if (adminAuth?.signOut) {
      // fallback for older versions
      await adminAuth.signOut(user.id);
    } else {
      console.warn("Supabase admin API does not support token invalidation in this version.");
    }
  } catch (err: any) {
    console.warn("Failed to invalidate refresh tokens:", err?.message ?? err);
  }

  return NextResponse.json({ success: true });
}

/* -------------------------------------------------------------------------- */
/*                                 PUT (LOG)                                  */
/* -------------------------------------------------------------------------- */
export async function PUT(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] || body.ip_address || null;

  const payload = {
    user_id: user.id,
    device_name: body.device_name ?? "Unknown Device",
    user_agent: body.user_agent ?? null,
    ip_address: ip,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_sessions")
    .upsert(payload, { onConflict: "user_id,user_agent" });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
