// conexion.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://rwhpkuobljjolyjxgvgh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pyxeGlvqoy3LLneDqQRxKw_hJbU077N';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
