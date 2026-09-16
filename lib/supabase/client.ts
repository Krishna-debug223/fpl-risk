import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://cgciccssduspivknfrfc.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3AJjXKY28uYD3cUGRzlSgw_YtdQgimU";

export function isSupabaseConfigured() {
  return true;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return createBrowserClient(url, key);
}
