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
}

export function createSupabaseServerInstance({ headers, cookies }: CreateSupabaseServerInstanceParams) {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
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
