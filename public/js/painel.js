import { supabase } from './supabase.js';

const grid = document.getElementById('grid-pedidos');
const audio = new Audio('[https://actions.google.com/sounds/v1/alarms/beep_short.ogg](https://actions.google.com/sounds/v1/alarms/beep_short.ogg)');

// Carregar Iniciais
async function init() {
    const { data } = await supabase.from('pedidos')
        .select('*').order('created_at', { ascending: false });
    
    if (data) data.forEach(p => adicionarCard(p));
    
    // Realtime
    supabase.channel('pedidos')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, payload => {
            adicionarCard(payload.new, true);
            audio.play().catch(e => console.log('Audio bloqueado pelo browser'));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, payload => {
            atualizarCardDOM(payload.new);
        })
        .subscribe();
}

function adicionarCard(pedido, novo = false) {
    const card = document.createElement('div');
    card.className = `card status-${pedido.status}`;
    card.id = `pedido-${pedido.id}`;
    
    const listaItens = pedido.itens ? pedido.itens.map(i => `<li>${i.nome}</li>`).join('') : '<li>Sem itens</li>';

    card.innerHTML = `
        <div class="card-header">
            <span class="senha">${pedido.senha_curta}</span>
            <span class="time">${new Date(pedido.created_at).toLocaleTimeString().slice(0,5)}</span>
        </div>
        <ul class="card-itens">${listaItens}</ul>
        <div class="card-actions">
            ${pedido.status === 'novo' ? `<button onclick="mudarStatus('${pedido.id}', 'preparando')">Iniciar Preparo</button>` : ''}
            ${pedido.status === 'preparando' ? `<button onclick="mudarStatus('${pedido.id}', 'pronto')">Marcar Pronto</button>` : ''}
            <a href="${pedido.receita_url}" target="_blank" class="btn-link">Ver Receita</a>
        </div>
    `;

    if (novo) grid.prepend(card);
    else grid.appendChild(card);
}

function atualizarCardDOM(pedido) {
    const oldCard = document.getElementById(`pedido-${pedido.id}`);
    if (oldCard) oldCard.remove();
    // Se ainda não foi entregue/arquivado, readiciona com novo status
    if (pedido.status !== 'entregue') {
        adicionarCard(pedido, true); // Coloca no topo se atualizou
    }
}

window.mudarStatus = async (id, status) => {
    await supabase.from('pedidos').update({ status }).eq('id', id);
}

init();
