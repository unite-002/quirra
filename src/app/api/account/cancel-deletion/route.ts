import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user ?? null;
}

export async function POST(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_pending_deletion: false, deletion_date: null })
    .eq("id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    message: "Account deletion has been cancelled successfully.",
  });
}
