// src/app/api/security/codes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Service client — for DB actions (secure)
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Helper — verify Supabase JWT and return user info.
 * Use the anon key to verify user tokens, not the service key.
 */
async function getUserFromBearer(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error } = await anonClient.auth.getUser(token);
  if (error || !userData?.user) {
    console.error("❌ Token verification failed:", error?.message);
    return null;
  }
  return userData.user;
}

/**
 * Generate 8 secure backup codes (format XXXX-XXXX)
 */
function generateBackupCodes(n = 8) {
  const arr: string[] = [];
  for (let i = 0; i < n; i++) {
    const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const code = `${uuid.slice(0, 4)}-${uuid.slice(4, 8)}`;
    arr.push(code);
  }
  return arr;
}

/* -------------------------------------------------------------------------- */
/*                                GET Handler                                 */
/* -------------------------------------------------------------------------- */
export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await serviceClient
    .from("user_security")
    .select(
      "two_factor_method, backup_codes, backup_codes_generated_at, verified, recovery_email"
    )
    .eq("user_id", user.id)
    .single();

  if (error && (error as any).code !== "PGRST116") {
    console.error("❌ Supabase fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Initialize record if not found
  if (!data) {
    await serviceClient.from("user_security").insert({
      user_id: user.id,
      two_factor_method: null,
      backup_codes: [],
      verified: false,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ data: data ?? null });
}

/* -------------------------------------------------------------------------- */
/*                                POST Handler                                */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();

  /* --------------------- REGENERATE BACKUP CODES --------------------- */
  if (body.action === "regenerate") {
    const codes = generateBackupCodes(8);
    const now = new Date().toISOString();

    const { error } = await serviceClient.from("user_security").upsert({
      user_id: user.id,
      two_factor_method: "backup_codes",
      backup_codes: codes,
      backup_codes_generated_at: now,
      verified: true,
      updated_at: now,
    });

    if (error) {
      console.error("❌ Regenerate error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ backupCodes: codes, generatedAt: now });
  }

  /* --------------------- SET 2FA METHOD --------------------- */
  if (body.action === "setMethod") {
    const method = body.method ?? null;
    const payload: any = {
      user_id: user.id,
      two_factor_method: method,
      updated_at: new Date().toISOString(),
    };

    if (method === null) {
      payload.verified = false;
      payload.backup_codes = [];
    }

    const { error } = await serviceClient.from("user_security").upsert(payload);
    if (error) {
      console.error("❌ setMethod error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  /* --------------------- SAVE RECOVERY EMAIL --------------------- */
  if (body.action === "saveRecoveryEmail") {
    const recoveryEmail = body.email;
    if (!recoveryEmail || typeof recoveryEmail !== "string") {
      return NextResponse.json(
        { error: "Invalid recovery email" },
        { status: 400 }
      );
    }

    const { error } = await serviceClient.from("user_security").upsert({
      user_id: user.id,
      recovery_email: recoveryEmail,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ saveRecoveryEmail error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, email: recoveryEmail });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/* -------------------------------------------------------------------------- */
/*                                PATCH Handler                               */
/* -------------------------------------------------------------------------- */
export async function PATCH(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { field, value } = body;

  if (!field)
    return NextResponse.json({ error: "Missing field" }, { status: 400 });

  const updateData: any = {
    [field]: value,
    updated_at: new Date().toISOString(),
  };

  const { error } = await serviceClient
    .from("user_security")
    .update(updateData)
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ PATCH update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
