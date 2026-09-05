import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env ?? {};
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Minimal fallback client to prevent runtime crashes
function createFallbackClient() {
  return {
    from: () => ({
      select: async () => ({ data: [], error: null }),
      eq: () => ({
        select: async () => ({ data: [], error: null }),
        order: async () => ({ data: [], error: null }),
        single: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null })
      }),
      order: async () => ({ data: [], error: null }),
      insert: async () => ({ data: null, error: null })
    })
  } as any;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createFallbackClient();

// Game score functions - used for high score persistence
export const saveScore = async (userId: string, gameType: string, score: number, difficulty: string = 'NORMAL') => {
  const { data, error } = await supabase
    .from('game_scores')
    .insert([{ user_id: userId, game_type: gameType, score, difficulty }])
    .select();
  return { data, error };
};

export const getHighScores = async (userId: string, gameType?: string) => {
  let query = supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (gameType) {
    query = query.eq('game_type', gameType);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const getGlobalLeaderboard = async (gameType: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('game_scores')
    .select('score, created_at')
    .eq('game_type', gameType)
    .order('score', { ascending: false })
    .limit(limit);
  
  return { data, error };
};
