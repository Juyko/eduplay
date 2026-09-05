import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chdtblqyhjbbznzabbtj.supabase.co';
const supabaseAnonKey = 'sb_publishable_NPaztGaZ4PoCDTUFehbkfg_hvDU9lgf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
