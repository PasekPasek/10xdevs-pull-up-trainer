import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);
const PUBLIC_API_ROUTES = new Set(["/api/auth/login", "/api/auth/register", "/api/auth/logout"]);
const ADMIN_ROUTES = ["/admin"];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerInstance({ headers: context.request.headers, cookies: context.cookies });

  context.locals.supabase = supabase;
  const pathname = context.url.pathname;

  if (PUBLIC_API_ROUTES.has(pathname)) {
    return next();
  }

  const {
    data: { session, user },
  } = await supabase.auth.getSession();

  if (PUBLIC_ROUTES.has(pathname)) {
    if (user && (pathname === "/login" || pathname === "/register")) {
      return context.redirect("/dashboard");
    }

    return next();
  }

  if (!user || !session) {
    const redirectTarget = pathname === "/login" ? "/dashboard" : `/login?redirect=${encodeURIComponent(pathname)}`;
    return context.redirect(redirectTarget);
  }

  const requiresAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isAdmin = user.app_metadata?.role === "admin";

  if (requiresAdmin && !isAdmin) {
    return context.redirect("/dashboard");
  }

  context.locals.user = user;

  return next();
});
