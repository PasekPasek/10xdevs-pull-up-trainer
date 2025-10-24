import type { Database } from "@/db/database.types";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    appMetadata: Record<string, unknown> | null;
    createdAt: string;
  };
}

export class AuthService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async login(params: LoginParams): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error || !data.session || !data.user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return this.mapAuthResult(data.user, data.session, params.email);
  }

  async register(params: RegisterParams): Promise<AuthResult> {
    const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
      email: params.email,
      password: params.password,
    });

    if (signUpError) {
      // Log the actual error for debugging
      console.error("Supabase signUp error:", {
        message: signUpError.message,
        status: signUpError.status,
        code: signUpError.code,
        name: signUpError.name,
      });

      if (signUpError.code === "user_already_exists") {
        throw new Error("EMAIL_EXISTS");
      }

      // Include the actual error message for better debugging
      const error = new Error("REGISTRATION_FAILED");
      (error as any).cause = signUpError.message;
      throw error;
    }

    // If signUp returns a session, user is auto-confirmed (email confirmation disabled)
    if (signUpData.session && signUpData.user) {
      return this.mapAuthResult(signUpData.user, signUpData.session, params.email);
    }

    // If no session but user exists, email confirmation is required
    // In this case, user needs to confirm email before signing in
    if (signUpData.user && !signUpData.session) {
      throw new Error("EMAIL_CONFIRMATION_REQUIRED");
    }

    // Fallback: try to auto-login (shouldn't happen, but keep for safety)
    const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (signInError || !signInData.session || !signInData.user) {
      throw new Error("AUTO_LOGIN_FAILED");
    }

    return this.mapAuthResult(signInData.user, signInData.session, params.email);
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error("LOGOUT_FAILED");
    }
  }

  private mapAuthResult(user: User, _session: Session, fallbackEmail: string): AuthResult {
    return {
      user: {
        id: user.id,
        email: user.email ?? fallbackEmail,
        appMetadata: user.app_metadata ?? null,
        createdAt: user.created_at,
      },
    };
  }
}

export function createAuthService(supabase: SupabaseClient<Database>): AuthService {
  return new AuthService(supabase);
}
