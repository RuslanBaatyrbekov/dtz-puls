// Edge Function: tell observers (by Web Push) that a learner came online or finished a lesson.
// Called by the learner's app. Each observer chooses what they want in the app (table observer_notify).
// Deploy: Edge Functions → Deploy a new function → name notify-observers → paste → Deploy.
// Settings: "Verify JWT with legacy secret" OFF (this function checks the user itself).
// Secrets: the same as send-reminders (VAPID_PUBLIC, VAPID_PRIVATE and the service key).
import webpush from 'npm:web-push@3.6.7';

const VERSION = 'v1';
const ONLINE_GAP_HOURS = 3; // at most one "online" push per learner in this time

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function serviceKey(): string {
  const k = Deno.env.get('SERVICE_KEY');
  if (k) return k;
  const j = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (j) {
    try {
      const o = JSON.parse(j);
      const v = o.default ?? Object.values(o)[0];
      if (v) return String(v);
    } catch (_) {
      /* ignore */
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

// [title, body]; {name}, {n} and {title} are filled in.
const ONLINE: Record<string, [string, string]> = {
  ru: ['🟢 {name} в сети', 'Открыл(а) DTZ-Puls'],
  uk: ['🟢 {name} в мережі', 'Відкрив(ла) DTZ-Puls'],
  en: ['🟢 {name} is online', 'Opened DTZ-Puls'],
  tr: ['🟢 {name} çevrimiçi', 'DTZ-Puls’u açtı'],
  ar: ['🟢 {name} متصل الآن', 'فتح DTZ-Puls'],
  ur: ['🟢 {name} آن لائن ہے', 'DTZ-Puls کھولا'],
  fa: ['🟢 {name} آنلاین است', 'DTZ-Puls را باز کرد'],
  hr: ['🟢 {name} je na mreži', 'Otvorio/la je DTZ-Puls'],
  sr: ['🟢 {name} je na mreži', 'Otvorio/la je DTZ-Puls'],
  my: ['🟢 {name} အွန်လိုင်း', 'DTZ-Puls ကို ဖွင့်ထားသည်'],
  es: ['🟢 {name} está en línea', 'Ha abierto DTZ-Puls'],
  hi: ['🟢 {name} ऑनलाइन है', 'DTZ-Puls खोला'],
  fr: ['🟢 {name} est en ligne', 'A ouvert DTZ-Puls']
};
const LESSON: Record<string, [string, string]> = {
  ru: ['✓ {name}: день {n} пройден', '{title}'],
  uk: ['✓ {name}: день {n} пройдено', '{title}'],
  en: ['✓ {name} finished day {n}', '{title}'],
  tr: ['✓ {name}: {n}. gün tamam', '{title}'],
  ar: ['✓ {name}: أنهى اليوم {n}', '{title}'],
  ur: ['✓ {name}: دن {n} مکمل', '{title}'],
  fa: ['✓ {name}: روز {n} تمام شد', '{title}'],
  hr: ['✓ {name}: dan {n} završen', '{title}'],
  sr: ['✓ {name}: dan {n} završen', '{title}'],
  my: ['✓ {name}: နေ့ {n} ပြီးပြီ', '{title}'],
  es: ['✓ {name} terminó el día {n}', '{title}'],
  hi: ['✓ {name}: दिन {n} पूरा', '{title}'],
  fr: ['✓ {name} a terminé le jour {n}', '{title}']
};
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') || '';
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const pub = Deno.env.get('VAPID_PUBLIC'),
    priv = Deno.env.get('VAPID_PRIVATE'),
    key = serviceKey();
  if (!pub || !priv || !key) return json({ error: 'config', v: VERSION }, 500);

  // 1. Who is calling?
  const who = await fetch(url + '/auth/v1/user', { headers: { Authorization: auth, apikey } });
  if (!who.ok) return json({ error: 'auth', v: VERSION }, 401);
  const me = await who.json();

  let body: { event?: string; day?: string; n?: number; title?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'body' }, 400);
  }
  const event = body.event === 'lesson' ? 'lesson' : 'online';
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const get = async (path: string) => {
    const r = await fetch(url + '/rest/v1/' + path, { headers: H });
    return r.ok ? await r.json() : [];
  };

  // 2. Throttle: one "online" per learner per few hours, one push per finished day.
  const logKey = event === 'lesson' ? String(body.day || '').slice(0, 40) : '';
  const prev = await get(
    `notify_log?select=sent_at&learner=eq.${me.id}&kind=eq.${event}&key=eq.${encodeURIComponent(logKey)}`
  );
  if (Array.isArray(prev) && prev.length) {
    const age = (Date.now() - new Date(prev[0].sent_at).getTime()) / 3600e3;
    if (event === 'lesson' || age < ONLINE_GAP_HOURS)
      return json({ ok: true, skipped: 'recent', v: VERSION });
  }
  await fetch(url + '/rest/v1/notify_log?on_conflict=learner,kind,key', {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ learner: me.id, kind: event, key: logKey, sent_at: new Date().toISOString() })
  });

  // 3. Observers who want this kind of news (never the caller themselves).
  const prefs = await get(`observer_notify?select=user_id&${event}=eq.true`);
  const obsIds = (Array.isArray(prefs) ? prefs : [])
    .map((p: { user_id: string }) => p.user_id)
    .filter(id => id !== me.id);
  if (!obsIds.length) return json({ ok: true, sent: 0, v: VERSION });

  const mine = await get(`progress?select=state&user_id=eq.${me.id}`);
  const name = (Array.isArray(mine) && mine[0]?.state?.name) || (me.email || '').split('@')[0] || '?';
  const obsProg = await get(`progress?select=user_id,state&user_id=in.(${obsIds.join(',')})`);
  const langOf: Record<string, string> = {};
  for (const p of Array.isArray(obsProg) ? obsProg : []) langOf[p.user_id] = p.state?.lang || 'ru';
  const subs = await get(`push_subs?select=*&user_id=in.(${obsIds.join(',')})`);

  webpush.setVapidDetails('mailto:dtz-puls@users.noreply.github.com', pub, priv);
  let sent = 0;
  for (const s of Array.isArray(subs) ? subs : []) {
    const table = event === 'lesson' ? LESSON : ONLINE;
    const lang = table[langOf[s.user_id]] ? langOf[s.user_id] : 'en';
    const v = { name, n: String(body.n ?? ''), title: String(body.title || '').slice(0, 80) };
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: fill(table[lang][0], v),
          body: fill(table[lang][1], v),
          url: './#watch',
          tag: 'dtz-learner-' + me.id
        }),
        { TTL: 3600, urgency: 'normal' }
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410)
        await fetch(url + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(s.endpoint), {
          method: 'DELETE',
          headers: H
        });
      else console.error(VERSION, 'push failed', code, String(e));
    }
  }
  return json({ ok: true, sent, v: VERSION });
});
