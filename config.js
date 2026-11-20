/* Supabase connection: Project Settings → API (Data API).
   The anon / publishable key is safe to publish: without a signed-in session it grants
   nothing, access is enforced by the Row Level Security policies in schema.sql.
   Never put the service_role / secret key here. */
window.PULS_CONFIG = {
  url: 'https://miidzagigpjlyjonbrxm.supabase.co',
  anonKey: 'sb_publishable_7Yga8MTYdODkf_HqzzhGTA_hnKKNaK5',
  // Web Push public key (VAPID). Public by design; the private key lives only in Supabase secrets.
  vapidPublic: 'BMtLxR6pFpD-lNxkONKNWTPZsvWn-CQtTV1QUNoL9PgHg0XAuabR1-8kMpc9gsj3C4Pu2Z9GHk9LqR-_UHVkzzk'
};
