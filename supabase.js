const SUPABASE_URL = (window.SUPABASE_URL || "https://jdmzhqneamuzcfnzdyui.supabase.co").trim();
const SUPABASE_ANON_KEY = (
  window.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbXpocW5lYW11emNmbnpkeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDkyMjcsImV4cCI6MjA5NDE4NTIyN30.4H5JshIUxWFncg-Gicx-qbOcwDBZcLKfFIGDjuVquHs"
).trim();

const hasValidConfig =
  SUPABASE_URL.startsWith("http") &&
  SUPABASE_ANON_KEY.length > 20 &&
  typeof window.supabase?.createClient === "function";

const supabaseClient = hasValidConfig
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
