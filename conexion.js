// conexion.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

const SUPABASE_URL = 'https://rwhpkuobljjolyjxgvgh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pyxeGlvqoy3LLneDqQRxKw_hJbU077N';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
