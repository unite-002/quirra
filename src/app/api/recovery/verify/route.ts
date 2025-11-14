import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Helper: verify user session via bearer token
 */
async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Verifies recovery email using the code the user entered.
 */
export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { email, code } = await req.json();
    if (!email || !code)
      return NextResponse.json({ error: "Email or code missing" }, { status: 400 });

    // Try verifying OTP with Supabase
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError || !data?.user)
      return NextResponse.json(
        { error: verifyError?.message || "Invalid or expired code" },
        { status: 400 }
      );

    // If verified, mark recovery email as confirmed
    await supabase
      .from("user_security")
      .update({
        recovery_email: email,
        pending_recovery_email: null,
        recovery_email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "Recovery email verified and saved.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
