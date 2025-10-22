import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for test cleanup
 * Uses service role key if available, otherwise anon key
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }

  // Use service role key for cleanup if available (bypasses RLS)
  const key = supabaseServiceKey || supabaseKey;
  
  if (!key) {
    throw new Error('Missing SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Delete all sessions for a specific user
 * Authenticates as the user to bypass RLS restrictions
 */
export async function cleanupUserSessions(userId: string, userEmail?: string, userPassword?: string) {
  const supabase = getSupabaseClient();

  try {
    // If credentials provided, sign in to bypass RLS
    if (userEmail && userPassword) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (authError) {
        console.error('Error authenticating for cleanup:', authError);
        // Continue anyway - service role might be configured
      }
    }

    // First, check how many sessions exist
    const { data: existingSessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${existingSessions?.length || 0} sessions for user ${userId}`);

    if (!existingSessions || existingSessions.length === 0) {
      console.log(`No sessions to clean up for user ${userId}`);
      return;
    }

    // Delete all sessions for the test user
    const { error: deleteError, count } = await supabase
      .from('sessions')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting sessions:', deleteError);
      throw deleteError;
    }

    console.log(`Deleted ${count || 0} sessions for user ${userId}`);
    
    // Sign out after cleanup
    if (userEmail && userPassword) {
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
    throw error;
  }
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }

  return data || [];
}

