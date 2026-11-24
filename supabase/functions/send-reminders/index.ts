// DTZ-Puls: daily study reminders via Web Push.
// Called every 15 minutes by pg_cron (see push.sql). Sends one push per day per device,
// at the hour the learner chose, and only if that learner has not studied yet today.
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC, VAPID_PRIVATE, CRON_SECRET,
// plus the service key as for create-learner (SERVICE_KEY or the built-in ones).
// "Verify JWT" must be OFF for this function: the cron job authenticates with x-cron-secret.
import webpush from 'npm:web-push@3.6.7';

const VERSION = 'v1';
const URL_ = Deno.env.get('SUPABASE_URL')!;
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
const KEY = serviceKey();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const MSG: Record<string, [string, string]> = {
  ru: ['Пора заниматься 💪', 'Сегодняшний урок ждёт — около 20 минут.'],
  uk: ['Час займатися 💪', 'Сьогоднішній урок чекає — близько 20 хвилин.'],
  en: ['Time to practise 💪', 'Today’s lesson is waiting — about 20 minutes.'],
  tr: ['Çalışma zamanı 💪', 'Bugünkü ders seni bekliyor — yaklaşık 20 dakika.'],
  ar: ['حان وقت الدرس 💪', 'درس اليوم بانتظارك — نحو 20 دقيقة.'],
  ur: ['پڑھائی کا وقت 💪', 'آج کا سبق آپ کا منتظر ہے — تقریباً 20 منٹ۔'],
  fa: ['وقت تمرین است 💪', 'درس امروز منتظر شماست — حدود ۲۰ دقیقه.'],
  hr: ['Vrijeme je za učenje 💪', 'Današnja lekcija te čeka — oko 20 minuta.'],
  sr: ['Vreme je za učenje 💪', 'Današnja lekcija te čeka — oko 20 minuta.'],
  my: ['လေ့ကျင့်ချိန် ရောက်ပြီ 💪', 'ယနေ့ သင်ခန်းစာ စောင့်နေသည် — မိနစ် ၂၀ ခန့်။'],
  es: ['Hora de estudiar 💪', 'La lección de hoy te espera: unos 20 minutos.'],
  hi: ['पढ़ाई का समय 💪', 'आज का पाठ आपका इंतज़ार कर रहा है — लगभग 20 मिनट।'],
  fr: ['C’est l’heure de travailler 💪', 'La leçon du jour vous attend — environ 20 minutes.']
};
const STREAK: Record<string, string> = {
  ru: 'Серия ♥ {n} дн. — не прерывай её!',
  uk: 'Серія ♥ {n} дн. — не переривай її!',
  en: 'Your ♥ streak: {n} days — keep it going!',
  tr: '♥ serin: {n} gün — bozma!',
  ar: 'سلسلتك ♥ {n} يومًا — حافظ عليها!',
  ur: 'آپ کا ♥ سلسلہ: {n} دن — اسے جاری رکھیں!',
  fa: 'زنجیرهٔ ♥ شما: {n} روز — نگهش دارید!',
  hr: 'Niz ♥ {n} dana — nemoj ga prekinuti!',
  sr: 'Niz ♥ {n} dana — nemoj da ga prekineš!',
  my: '♥ ဆက်တိုက် {n} ရက် — မပြတ်စေနှင့်!',
  es: 'Tu racha ♥: {n} días — ¡no la pierdas!',
  hi: 'आपका ♥ सिलसिला: {n} दिन — इसे बनाए रखें!',
  fr: 'Votre série ♥ : {n} jours — ne la perdez pas !'
};

function local(tz: string): { date: string; hour: number } {
  let z = tz;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: z });
  } catch (_) {
    z = 'Europe/Berlin';
  }
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: z,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(new Date())
      .map(x => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
function prevDay(d: string): string {
  const x = new Date(d + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() - 1);
  return x.toISOString().slice(0, 10);
}
function streakBefore(days: Record<string, unknown>, today: string): number {
  let n = 0,
    d = prevDay(today);
  while (days && days[d] !== undefined) {
    n++;
    d = prevDay(d);
  }
  return n;
}

Deno.serve(async req => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret)
    return new Response(JSON.stringify({ error: 'forbidden', v: VERSION }), { status: 403 });
  const pub = Deno.env.get('VAPID_PUBLIC'),
    priv = Deno.env.get('VAPID_PRIVATE');
  if (!pub || !priv || !KEY)
    return new Response(JSON.stringify({ error: 'missing secrets', v: VERSION }), { status: 500 });
  webpush.setVapidDetails('mailto:dtz-puls@users.noreply.github.com', pub, priv);

  const subs = await (await fetch(`${URL_}/rest/v1/push_subs?select=*`, { headers: H })).json();
  if (!Array.isArray(subs))
    return new Response(JSON.stringify({ error: 'read failed', detail: subs, v: VERSION }), { status: 500 });
  const due = subs.filter(s => {
    const l = local(s.tz);
    return l.hour === s.hour && s.last_sent !== l.date;
  });
  if (!due.length) return new Response(JSON.stringify({ ok: true, due: 0, v: VERSION }));

  const ids = [...new Set(due.map(s => s.user_id))];
  const prog = await (
    await fetch(`${URL_}/rest/v1/progress?select=user_id,state&user_id=in.(${ids.join(',')})`, { headers: H })
  ).json();
  const byUser: Record<string, any> = {};
  if (Array.isArray(prog)) for (const p of prog) byUser[p.user_id] = p.state || {};

  let sent = 0,
    skipped = 0,
    gone = 0;
  for (const s of due) {
    const l = local(s.tz),
      st = byUser[s.user_id] || {},
      days = st.days || {};
    const mark = () =>
      fetch(`${URL_}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
        method: 'PATCH',
        headers: H,
        body: JSON.stringify({ last_sent: l.date })
      });
    if (days[l.date] !== undefined) {
      skipped++;
      await mark();
      continue;
    }
    const lang = MSG[st.lang] ? st.lang : 'en';
    const n = streakBefore(days, l.date);
    const body = MSG[lang][1] + (n >= 2 ? ' ' + STREAK[lang].replace('{n}', String(n)) : '');
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: MSG[lang][0], body, url: './#path', tag: 'dtz-daily' }),
        { TTL: 3 * 3600, urgency: 'normal' }
      );
      sent++;
      await mark();
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        gone++;
        await fetch(`${URL_}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
          method: 'DELETE',
          headers: H
        });
      } else console.error('push failed', code, String(e));
    }
  }
  return new Response(JSON.stringify({ ok: true, due: due.length, sent, skipped, gone, v: VERSION }));
});
