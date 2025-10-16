import type { AstroCookies } from "astro";

interface SetSessionOptions {
  rememberMe: boolean;
  expiresAt: string | null;
  expiresIn: number;
}

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const ACCESS_TOKEN_FALLBACK_MAX_AGE_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_LONG_LIVED_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export class SessionManager {
  constructor(private readonly cookies: AstroCookies) {}

  setSession(accessToken: string, refreshToken: string | null, options: SetSessionOptions): void {
    const accessTokenMaxAge = options.expiresIn ?? ACCESS_TOKEN_FALLBACK_MAX_AGE_SECONDS;

    this.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: import.meta.env.PROD,
      path: "/",
      maxAge: accessTokenMaxAge,
    });

    if (refreshToken) {
      this.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: import.meta.env.PROD,
        path: "/",
        maxAge: options.rememberMe ? REFRESH_TOKEN_LONG_LIVED_MAX_AGE_SECONDS : undefined,
      });
    }
  }

  clearSession(): void {
    this.cookies.delete(ACCESS_TOKEN_COOKIE, { path: "/" });
    this.cookies.delete(REFRESH_TOKEN_COOKIE, { path: "/" });
  }
}

export function createSessionManager(cookies: AstroCookies): SessionManager {
  return new SessionManager(cookies);
}
