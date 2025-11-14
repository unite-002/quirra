import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Verify bearer token & fetch user
 */
async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Revokes all sessions by invalidating refresh tokens.
 */
export async function POST(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // Supabase v2 equivalent for revoking all sessions:
    const { error } = await supabaseAdmin.auth.admin.signOut(user.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Optional: clean user_sessions table for this user
    await supabaseAdmin.from("user_sessions").delete().eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "All active sessions revoked successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
