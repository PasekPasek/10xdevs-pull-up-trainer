import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);
const PUBLIC_API_ROUTES = new Set(["/api/auth/login", "/api/auth/register", "/api/auth/logout"]);
const ADMIN_ROUTES = ["/admin"];
const STATIC_FILE_REGEX = /\.[^/]+$/;

function buildLoginRedirect(url: URL) {
  const target = `${url.pathname}${url.search}`;

  if (!target || target === "/login" || target === "/register") {
    return "/login";
  }

  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("redirect", target);

  return `${loginUrl.pathname}${loginUrl.search}`;
}

function buildJsonError(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url } = context;
  const pathname = url.pathname;

  if (STATIC_FILE_REGEX.test(pathname)) {
    return next();
  }

  // Get runtime environment variables from Cloudflare context
  const runtime = context.locals.runtime as { env?: Record<string, string> } | undefined;
  const env = runtime?.env;

  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
    env: env
      ? {
          SUPABASE_URL: env.SUPABASE_URL,
          SUPABASE_KEY: env.SUPABASE_KEY,
        }
      : undefined,
  });
  context.locals.supabase = supabase;

  if (PUBLIC_API_ROUTES.has(pathname)) {
    return next();
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error) {
    context.locals.user = user ?? undefined;
  }

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  if (isPublicRoute) {
    if (user && pathname !== "/dashboard") {
      return context.redirect("/dashboard");
    }

    return next();
  }

  if (!user) {
    if (isApiRoute) {
      return buildJsonError(401, "UNAUTHORIZED", "Authentication required");
    }

    return context.redirect(buildLoginRedirect(url));
  }

  const requiresAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isAdmin = user.app_metadata?.role === "admin";

  if (requiresAdmin && !isAdmin) {
    if (isApiRoute) {
      return buildJsonError(403, "FORBIDDEN", "Insufficient permissions");
    }

    return context.redirect("/dashboard");
  }

  return next();
});
