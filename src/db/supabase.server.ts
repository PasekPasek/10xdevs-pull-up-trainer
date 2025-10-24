import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types";

export const cookieOptions: CookieOptionsWithName = {
  name: "sb",
  path: "/",
  sameSite: "lax",
  secure: true,
  httpOnly: true,
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

interface CreateSupabaseServerInstanceParams {
  headers: Headers;
  cookies: import("astro").AstroCookies;
  env?: {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
  };
}

export function createSupabaseServerInstance({ headers, cookies, env }: CreateSupabaseServerInstanceParams) {
  // Use runtime env from Cloudflare if available, otherwise fall back to import.meta.env
  const supabaseUrl = env?.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseKey = env?.SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

  // Debug logging for Cloudflare deployment
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials missing!", {
      hasRuntimeUrl: !!env?.SUPABASE_URL,
      hasRuntimeKey: !!env?.SUPABASE_KEY,
      hasImportMetaUrl: !!import.meta.env.SUPABASE_URL,
      hasImportMetaKey: !!import.meta.env.SUPABASE_KEY,
    });
  }

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        const cookieHeader = headers.get("cookie") ?? "";
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
