import type { SupabaseClient as GenericSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export type SupabaseClient = GenericSupabaseClient<Database>;

export const supabaseClient: SupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
