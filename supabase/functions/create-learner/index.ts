// Edge Function: an observer creates a learner account from the app.
// The service role key never leaves Supabase: it is injected as SUPABASE_SERVICE_ROLE_KEY.
// Deploy: Supabase → Edge Functions → Deploy a new function → name "create-learner" → paste this file.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function makePassword(): string {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // Who is calling? Must be a signed-in observer.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "auth" }, 401);
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: "auth" }, 401);
  const { data: obs } = await admin.from("observers").select("user_id").eq("user_id", caller.user.id).maybeSingle();
  if (!obs) return json({ error: "forbidden" }, 403);

  let body: { email?: string; password?: string; name?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "email" }, 400);
  const password = String(body.password || "").trim() || makePassword();
  if (password.length < 8) return json({ error: "password" }, 400);
  const name = String(body.name || "").trim().slice(0, 30);

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: name ? { name } : {},
  });
  if (error) return json({ error: /already/i.test(error.message) ? "exists" : error.message }, 400);
  return json({ id: data.user?.id, email, password, name });
});
