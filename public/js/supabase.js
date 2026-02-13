import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'SUA_SUPABASE_URL_AQUI'
const supabaseKey = 'SUA_SUPABASE_ANON_KEY_AQUI'
export const supabase = createClient(supabaseUrl, supabaseKey)
