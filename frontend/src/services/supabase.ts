import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
function publicKey(value: string): boolean {
  if (value.startsWith("sb_publishable_")) return true;
  try {
    return (
      JSON.parse(
        atob(value.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")),
      ).role === "anon"
    );
  } catch {
    return false;
  }
}
// Fail closed if configuration is absent or a private key was accidentally supplied.
export const supabase =
  url && key && publicKey(key) && /^https:\/\//.test(url)
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          flowType: "implicit",
          detectSessionInUrl: ["/reset-password", "/login"].includes(
            window.location.pathname,
          ),
        },
      })
    : null;
