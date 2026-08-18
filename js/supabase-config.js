/* ═══════════════════════════════════════════════════════════
   CHINNI ONE GRAM GOLD — Supabase Client Configuration
   ═══════════════════════════════════════════════════════════ */

(function initSupabaseClient() {
  const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://znyozgmomnfpzhgojwim.supabase.co';
  const SUPABASE_KEY = window.ENV_SUPABASE_KEY || window.ENV_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fbi7Qw-kD1Tkbohkpl0Vlw_lzSQL4B0';

  if (typeof supabase !== 'undefined' && supabase.createClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("[SupabaseConfig] Supabase Client initialized successfully with URL:", SUPABASE_URL);
  } else {
    console.warn("[SupabaseConfig] Waiting for Supabase JS SDK to load...");
  }
})();

