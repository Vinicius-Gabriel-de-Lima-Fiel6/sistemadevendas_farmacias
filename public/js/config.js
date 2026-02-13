import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

let supabaseInstance = null;

export async function getSupabase() {
    if (supabaseInstance) return supabaseInstance;

    try {
        // Busca as variáveis que estão no servidor Python
        const response = await fetch('/api/config');
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseKey) {
            console.error('Erro: Chaves não encontradas na API');
            return null;
        }

        // Cria o cliente
        supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey);
        return supabaseInstance;
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        return null;
    }
}
