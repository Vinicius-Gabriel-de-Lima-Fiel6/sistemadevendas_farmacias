import { supabase } from './config.js';

async function load() {
    const { data } = await supabase.from('pedidos').select('*').order('created_at', {ascending: false});
    const grid = document.getElementById('grid-pedidos');
    grid.innerHTML = '';
    data.forEach(p => {
        const div = document.createElement('div');
        div.className = `pedido-card status-${p.status}`;
        div.innerHTML = `
            <h3>Senha: ${p.senha_curta}</h3>
            <p><strong>Itens:</strong> ${p.itens.map(i => i.nome).join(', ')}</p>
            <small>Recebido em: ${new Date(p.created_at).toLocaleTimeString()}</small><br><br>
            <a href="${p.receita_url}" target="_blank">Ver Receita Original</a><br><br>
            <select onchange="window.updateStatus('${p.id}', this.value)">
                <option value="novo" ${p.status === 'novo' ? 'selected' : ''}>Novo</option>
                <option value="preparando" ${p.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                <option value="pronto" ${p.status === 'pronto' ? 'selected' : ''}>Pronto</option>
            </select>
        `;
        grid.appendChild(div);
    });
}

window.updateStatus = async (id, status) => {
    await supabase.from('pedidos').update({ status }).eq('id', id);
};

// Realtime
supabase.channel('pedidos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, load)
    .subscribe();

load();
