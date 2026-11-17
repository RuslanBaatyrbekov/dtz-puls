/* Supabase connection: Project Settings → API (Data API).
   The anon / publishable key is safe to publish: without a signed-in session it grants
   nothing, access is enforced by the Row Level Security policies in schema.sql.
   Never put the service_role / secret key here. */
window.PULS_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-KEY'
};
