import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import baseX from "base-x";

// ✅ Base62 alphabet (for short, readable slugs)
const base62 = baseX("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");

// ✅ Supabase admin client (uses service role key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return NextResponse.json(
        { error: "Missing conversation_id" },
        { status: 400 }
      );
    }

    // ✅ Extract Bearer token from headers
    const authHeader = req.headers.get("Authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;

    if (!accessToken) {
      console.error("❌ Missing Authorization token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Create user-bound Supabase client for auth verification
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      }
    );

    // ✅ Validate the user identity
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify the conversation belongs to the authenticated user
    const { data: convo, error: convoErr } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, title")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (convoErr || !convo) {
      console.error("❌ Conversation not found:", convoErr);
      return NextResponse.json(
        { error: "Conversation not found or unauthorized" },
        { status: 404 }
      );
    }

    // ✅ Fetch all messages for this conversation
    const { data: messages, error: msgErr } = await supabaseAdmin
      .from("messages")
      .select("id, role, content, created_at")
      .eq("chat_session_id", conversation_id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("❌ Message fetch error:", msgErr);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // ✅ Build conversation snapshot
    const snapshot = {
      conversation_id,
      title: convo.title || "Conversation",
      shared_at: new Date().toISOString(),
      messages: messages || [],
    };

    // ✅ Generate short, unique slug (8 chars)
    const slug = base62.encode(randomBytes(8));

    // ✅ Insert into the `shares` table
    const { error: insertErr } = await supabaseAdmin.from("shares").insert({
      conversation_id,
      owner_user_id: user.id,
      slug,
      snapshot,
      revoked: false,
      created_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error("❌ Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    // ✅ Construct the shareable public link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${appUrl}/share/${slug}`;

    console.log(`✅ Share link created: ${shareUrl}`);

    return NextResponse.json({ slug, url: shareUrl }, { status: 201 });
  } catch (err: any) {
    console.error("❌ Unexpected error in /api/shares:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
