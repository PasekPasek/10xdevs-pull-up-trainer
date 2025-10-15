import type { AstroCookies } from "astro";

interface SetSessionOptions {
  rememberMe: boolean;
  expiresAt: string | null;
  expiresIn: number;
}

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

export class SessionManager {
  constructor(private readonly cookies: AstroCookies) {}

  setSession(accessToken: string, refreshToken: string | null, options: SetSessionOptions): void {
    const maxAge = options.rememberMe ? options.expiresIn : undefined;

    this.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: import.meta.env.PROD,
      path: "/",
      maxAge,
    });

    if (refreshToken) {
      this.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: import.meta.env.PROD,
        path: "/",
        maxAge,
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
