// Edge Function: an observer creates a learner account from the app.
// The secret key never leaves Supabase. Deploy: Edge Functions → create-learner → Code → paste → Deploy.
// Settings: "Verify JWT with legacy secret" OFF (this function checks the user itself).
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

// Secret key: new-style projects expose SUPABASE_SECRET_KEYS (JSON), older ones SUPABASE_SERVICE_ROLE_KEY.
// A secret named SERVICE_KEY (Edge Functions → Secrets) overrides both.
function secretKey(): string {
  const own = Deno.env.get("SERVICE_KEY");
  if (own) return own;
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const o = JSON.parse(keys);
      const v = o.default || Object.values(o)[0];
      if (v) return String(v);
    } catch { /* ignore */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json({ error: "auth", detail: "no token" }, 401);

  // 1. Check the caller with their own session (publishable key + their token, RLS applies).
  const asUser = createClient(url, apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: me, error: meErr } = await asUser.auth.getUser();
  if (meErr || !me?.user) {
    console.error("getUser failed:", meErr?.message);
    return json({ error: "auth", detail: meErr?.message || "no user" }, 401);
  }
  const { data: obs, error: obsErr } = await asUser.from("observers").select("user_id").eq("user_id", me.user.id).maybeSingle();
  if (obsErr) console.error("observers check failed:", obsErr.message);
  if (!obs) return json({ error: "forbidden" }, 403);

  // 2. Validate input.
  let body: { email?: string; password?: string; name?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "email" }, 400);
  const password = String(body.password || "").trim() || makePassword();
  if (password.length < 8) return json({ error: "password" }, 400);
  const name = String(body.name || "").trim().slice(0, 30);

  // 3. Create the account with the secret key.
  const key = secretKey();
  if (!key) { console.error("no secret key in env"); return json({ error: "config", detail: "no secret key" }, 500); }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: name ? { name } : {},
  });
  if (error) {
    console.error("createUser failed:", error.message);
    return json({ error: /already/i.test(error.message) ? "exists" : error.message }, 400);
  }
  return json({ id: data.user?.id, email, password, name });
});
