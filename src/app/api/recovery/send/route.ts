import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Reads bearer token and verifies user session.
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
 * Send a verification code to a new recovery email.
 */
export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { email } = await req.json();
    if (!email || typeof email !== "string")
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });

    // Send verification email using Supabase built-in email OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { recoveryEmailFor: user.id },
      },
    });

    if (otpError)
      return NextResponse.json({ error: otpError.message }, { status: 500 });

    // Store pending recovery email until verified
    await supabase
      .from("user_security")
      .upsert({
        user_id: user.id,
        pending_recovery_email: email,
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to recovery email.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
