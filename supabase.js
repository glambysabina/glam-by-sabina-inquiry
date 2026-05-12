const SUPABASE_URL = window.SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

const supabaseClient =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
