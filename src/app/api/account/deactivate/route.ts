import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7);

    // Mark profile as pending deletion
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_pending_deletion: true,
        deletion_date: deletionDate.toISOString(),
      })
      .eq("id", user.id);

    if (profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      message: `Account scheduled for deletion on ${deletionDate.toDateString()}.`,
    });
  } catch (err: any) {
    console.error("Deactivate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
