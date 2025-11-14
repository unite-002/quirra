// src/app/api/devices/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user ?? null;
}

export async function GET(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", user.id)
    .order("last_used_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices: data });
}

export async function POST(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json(); // { device_name, user_agent, ip_address }
  const payload = {
    user_id: user.id,
    device_name: body.device_name ?? body.user_agent?.slice(0, 80) ?? "Unknown",
    user_agent: body.user_agent ?? null,
    ip_address: body.ip_address ?? null,
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_devices").insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await getUserFromBearer(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("user_devices").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
