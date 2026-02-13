import { getSupabase } from './config.js';

let supabase = null;
let pedidosLocais = [];

async function init() {
    supabase = await getSupabase();
    if (!supabase) return;

    atualizarPainel();

    // Escuta mudanças em tempo real
    supabase.channel('pedidos-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_totem' }, (payload) => {
            if (payload.eventType === 'INSERT') document.getElementById('alert-sound').play();
            atualizarPainel();
        })
        .subscribe();
}

async function atualizarPainel() {
    // Pega o org_id da URL (vindo do SynapseLab)
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('org');

    let query = supabase.from('pedidos_totem').select('*');
    if (orgId) query = query.eq('org_id', orgId);

    const { data } = await query.order('created_at', { ascending: false });
    pedidosLocais = data;

    renderizarColunas();
    atualizarContadores();
}

function renderizarColunas() {
    const colunas = {
        'novo': document.getElementById('list-novo'),
        'preparando': document.getElementById('list-preparando'),
        'pronto': document.getElementById('list-pronto')
    };

    // Limpa colunas
    Object.values(colunas).forEach(c => c.innerHTML = '');

    pedidosLocais.forEach(p => {
        const card = document.createElement('div');
        card.className = `pedido-card ${p.status === 'novo' ? 'pulse-border' : ''}`;
        card.innerHTML = `
            <div class="card-header">
                <span class="senha">#${p.senha_curta}</span>
                <span class="hora">${new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="card-body">
                <p>${p.itens.length} medicamento(s) detectado(s)</p>
            </div>
            <div class="card-actions">
                ${p.status === 'novo' ? `<button onclick="window.iniciarPreparo('${p.id}')">Iniciar</button>` : ''}
                ${p.status === 'preparando' ? `<button onclick="window.abrirConferencia('${p.id}')">Conferir & Entregar</button>` : ''}
            </div>
        `;
        colunas[p.status].appendChild(card);
    });
}

// Funções Globais para os Botões
window.iniciarPreparo = async (id) => {
    await supabase.from('pedidos_totem').update({ status: 'preparando' }).eq('id', id);
    atualizarPainel();
};

window.abrirConferencia = (id) => {
    const p = pedidosLocais.find(x => x.id === id);
    document.getElementById('img-receita-modal').src = p.receita_url;
    
    const editor = document.getElementById('itens-editor');
    editor.innerHTML = p.itens.map(i => `
        <div class="edit-item">
            <input type="text" value="${i.nome}">
            <input type="text" value="${i.dosagem}" style="width: 80px">
        </div>
    `).join('');

    document.getElementById('modal-conferencia').style.display = 'block';
    document.getElementById('btn-finalizar-preparo').onclick = () => window.finalizarPedido(id);
};

window.finalizarPedido = async (id) => {
    await supabase.from('pedidos_totem').update({ status: 'pronto' }).eq('id', id);
    document.getElementById('modal-conferencia').style.display = 'none';
    atualizarPainel();
};

function atualizarContadores() {
    document.getElementById('count-novo').innerText = pedidosLocais.filter(p => p.status === 'novo').length;
    document.getElementById('count-preparando').innerText = pedidosLocais.filter(p => p.status === 'preparando').length;
}

window.fecharModal = () => document.getElementById('modal-conferencia').style.display = 'none';

init();
