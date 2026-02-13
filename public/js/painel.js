import { getSupabase } from './config.js';

let supabase = null;

async function init() {
    supabase = await getSupabase();
    if (!supabase) return alert("Erro de conexão com o servidor.");

    loadPedidos();

    // Realtime Setup
    supabase.channel('pedidos-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, loadPedidos)
        .subscribe();
}

async function loadPedidos() {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', {ascending: false});

    if (error) return console.error(error);

    const grid = document.getElementById('grid-pedidos');
    grid.innerHTML = '';
    
    data.forEach(p => {
        const itensTexto = p.itens && Array.isArray(p.itens) 
            ? p.itens.map(i => `${i.nome} (${i.qtd})`).join(', ') 
            : 'Sem itens identificados';

        const div = document.createElement('div');
        div.className = `pedido-card status-${p.status}`;
        div.innerHTML = `
            <h3>Senha: ${p.senha_curta}</h3>
            <p><strong>Itens:</strong> ${itensTexto}</p>
            <small>Recebido em: ${new Date(p.created_at).toLocaleTimeString()}</small><br><br>
            <a href="${p.receita_url}" target="_blank" style="color: blue;">Ver Receita Original</a><br><br>
            <select onchange="window.updateStatus('${p.id}', this.value)" style="padding: 5px; width: 100%;">
                <option value="novo" ${p.status === 'novo' ? 'selected' : ''}>Novo</option>
                <option value="preparando" ${p.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                <option value="pronto" ${p.status === 'pronto' ? 'selected' : ''}>Pronto</option>
            </select>
        `;
        grid.appendChild(div);
    });
}

window.updateStatus = async (id, status) => {
    if (!supabase) return;
    await supabase.from('pedidos').update({ status }).eq('id', id);
};

// Iniciar
init();
