import { getSupabase } from './config.js';

let supabase = null;
let pedidosLocais = [];

async function init() {
    supabase = await getSupabase();
    if (!supabase) return;

    atualizarPainel();

    // Escuta em tempo real (Sem filtros de org por enquanto para não dar erro)
    supabase.channel('vendas-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
            atualizarPainel();
            // Toca o som de alerta se for um novo pedido
            const audio = document.getElementById('alert-sound');
            if(audio) audio.play().catch(() => {}); 
        })
        .subscribe();
}

async function atualizarPainel() {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return;
    }

    pedidosLocais = data;
    renderizarColunas();
}

function renderizarColunas() {
    const colNovo = document.getElementById('list-novo');
    const colPreparo = document.getElementById('list-preparando');
    const colPronto = document.getElementById('list-pronto');

    // Limpa as colunas
    colNovo.innerHTML = '';
    colPreparo.innerHTML = '';
    colPronto.innerHTML = '';

    pedidosLocais.forEach(p => {
        const card = document.createElement('div');
        card.className = `pedido-card status-${p.status}`;
        
        // Monta a lista de remédios simplificada para o card
        const listaRemedios = p.itens ? p.itens.map(i => i.nome).join(', ') : 'Verificando...';

        card.innerHTML = `
            <div class="card-header">
                <span class="senha">#${p.senha_curta}</span>
                <span class="hora">${new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="card-body">
                <p><strong>Remédios:</strong> ${listaRemedios}</p>
            </div>
            <div class="card-actions">
                ${p.status === 'novo' ? `<button onclick="window.mudarStatus('${p.id}', 'preparando')">ATENDER</button>` : ''}
                ${p.status === 'preparando' ? `<button class="btn-conferir" onclick="window.abrirConferencia('${p.id}')">CONFERIR RECEITA</button>` : ''}
                ${p.status === 'pronto' ? `<span class="badge-pronto">PRONTO</span>` : ''}
            </div>
        `;

        if (p.status === 'novo') colNovo.appendChild(card);
        else if (p.status === 'preparando') colPreparo.appendChild(card);
        else if (p.status === 'pronto') colPronto.appendChild(card);
    });
}

window.mudarStatus = async (id, novoStatus) => {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
    atualizarPainel();
};

window.abrirConferencia = (id) => {
    const p = pedidosLocais.find(x => x.id === id);
    if (!p) return;

    document.getElementById('img-receita-modal').src = p.receita_url;
    
    const editor = document.getElementById('itens-editor');
    editor.innerHTML = `<h4>Medicamentos Identificados:</h4>`;
    
    p.itens.forEach(i => {
        editor.innerHTML += `
            <div class="item-conferencia">
                <span class="nome-med">${i.nome}</span>
                <span class="dose-med">${i.dosagem}</span>
            </div>
        `;
    });

    document.getElementById('modal-conferencia').style.display = 'block';
    document.getElementById('btn-finalizar-preparo').onclick = () => {
        window.mudarStatus(id, 'pronto');
        window.fecharModal();
    };
};

window.fecharModal = () => {
    document.getElementById('modal-conferencia').style.display = 'none';
};

init();
