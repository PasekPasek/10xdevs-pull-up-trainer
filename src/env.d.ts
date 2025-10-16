/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: SupabaseClient<Database, "public", any>;
      user?: import("@supabase/supabase-js").User;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
