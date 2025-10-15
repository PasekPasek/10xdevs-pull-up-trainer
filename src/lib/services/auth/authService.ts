import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";

interface LoginParams {
  email: string;
  password: string;
}

interface LoginResult {
  user: {
    id: string;
    email: string;
    appMetadata: Record<string, unknown> | null;
    createdAt: string;
  };
  session: {
    accessToken: string;
    refreshToken: string | null;
    expiresIn: number;
    expiresAt: string | null;
  };
}

export class AuthService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async login(params: LoginParams): Promise<LoginResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error || !data.session || !data.user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? params.email,
        appMetadata: data.user.app_metadata ?? null,
        createdAt: data.user.created_at,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? null,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at ?? null,
      },
    };
  }
}

export function createAuthService(supabase: SupabaseClient<Database>): AuthService {
  return new AuthService(supabase);
}
