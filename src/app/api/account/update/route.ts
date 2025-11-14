// src/app/api/account/update/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user ?? null;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { full_name, email, region, newsletter } = body;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name,
    email,
    region,
    newsletter,
    updated_at: new Date().toISOString(),
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
