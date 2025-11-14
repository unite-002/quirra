import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("shares")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("slug", params.slug)
    .eq("owner_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
