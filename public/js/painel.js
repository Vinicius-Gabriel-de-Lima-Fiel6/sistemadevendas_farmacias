import { getSupabase } from './config.js';

let supabase = null;
let pedidosLocais = [];

async function init() {
    supabase = await getSupabase();
    if (!supabase) return;

    atualizarPainel();

    // Realtime: Atualiza quando algo muda no banco
    supabase.channel('pedidos-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                const audio = document.getElementById('alert-sound');
                if(audio) audio.play();
            }
            atualizarPainel();
        })
        .subscribe();
}

async function atualizarPainel() {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);
    pedidosLocais = data;

    renderizarColunas();
    document.getElementById('count-total').innerText = data.length;
}

function renderizarColunas() {
    const listas = {
        'novo': document.getElementById('list-novo'),
        'preparando': document.getElementById('list-preparando'),
        'pronto': document.getElementById('list-pronto')
    };

    Object.values(listas).forEach(l => l.innerHTML = '');

    pedidosLocais.forEach(p => {
        const div = document.createElement('div');
        div.className = `pedido-card status-${p.status}`;
        div.innerHTML = `
            <div class="card-header">
                <span class="senha">${p.senha_curta}</span>
                <span class="hora">${new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="card-body">
                <strong>${p.itens ? p.itens.length : 0} Itens</strong>
            </div>
            <div class="card-actions">
                ${p.status === 'novo' ? `<button class="btn-action" onclick="window.mudarStatus('${p.id}', 'preparando')">Atender</button>` : ''}
                ${p.status === 'preparando' ? `<button class="btn-action btn-blue" onclick="window.abrirConferencia('${p.id}')">Conferir</button>` : ''}
                ${p.status === 'pronto' ? `<small style="color: green">Aguardando Cliente</small>` : ''}
            </div>
        `;
        listas[p.status].appendChild(div);
    });
}

window.mudarStatus = async (id, novoStatus) => {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
    atualizarPainel();
};

window.abrirConferencia = (id) => {
    const p = pedidosLocais.find(x => x.id === id);
    document.getElementById('img-receita-modal').src = p.receita_url;
    
    const editor = document.getElementById('itens-editor');
    editor.innerHTML = p.itens.map(i => `
        <div class="edit-item">
            <span>${i.nome}</span>
            <span><strong>${i.dosagem}</strong></span>
        </div>
    `).join('');

    document.getElementById('modal-conferencia').style.display = 'block';
    document.getElementById('btn-finalizar-preparo').onclick = () => {
        window.mudarStatus(id, 'pronto');
        window.fecharModal();
    };
};

window.fecharModal = () => document.getElementById('modal-conferencia').style.display = 'none';

init();
