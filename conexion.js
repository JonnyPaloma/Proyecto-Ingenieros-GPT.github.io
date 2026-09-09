// Importamos el cliente oficial de Supabase desde internet
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Tu URL fija de Supabase
const supabaseUrl = 'https://rwhpkuobljjolyjxgvgh.supabase.co'

// Tu Clave publicable que copiaste de Supabase (reemplaza lo de adentro de las comillas)
const supabaseKey = 'sb_publishable_pyxeGlvqoy3LLneDqQRxKw_hJbU077N'

// Creamos y exportamos la conexión para que tus otros archivos la usen
export const supabase = createClient(supabaseUrl, supabaseKey)
