import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service key for secure server operations
);

// ✅ Fetch a public shared chat snapshot
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // 1️⃣ Get the shared record
    const { data, error } = await supabase
      .from("shares")
      .select("id, snapshot, revoked, expire_at, max_views, view_count")
      .eq("slug", params.slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 2️⃣ Check if revoked or expired
    if (data.revoked) {
      return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
    }
    if (data.expire_at && new Date(data.expire_at) < new Date()) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    // 3️⃣ Optional: limit max views
    if (data.max_views && data.view_count >= data.max_views) {
      return NextResponse.json({ error: "View limit reached." }, { status: 410 });
    }

    // 4️⃣ Increment view count (safe async)
    await supabase
      .from("shares")
      .update({
        view_count: (data.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    // 5️⃣ Return the public snapshot
    return NextResponse.json(data.snapshot, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching shared conversation:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
