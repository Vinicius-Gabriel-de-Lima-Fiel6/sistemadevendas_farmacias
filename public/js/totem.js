import { supabase } from './supabase.js';

const fileInput = document.getElementById('fileInput');
const listaEl = document.getElementById('lista-medicamentos');
let itensAtuais = [];
let imagemBase64 = null;
let imagemFile = null;

// 1. Captura e Preview
window.triggerCamera = () => fileInput.click();

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    imagemFile = file;

    mostrarTela('tela-loading');

    // Converter Base64 para IA
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        imagemBase64 = reader.result.split(',')[1];
        analisarReceita();
    };
});

// 2. Enviar para API Python
async function analisarReceita() {
    try {
        const req = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imagemBase64 })
        });
        
        const res = await req.json();
        itensAtuais = res.medicamentos || [];
        
        renderizarLista();
        mostrarTela('tela-resultado');
    } catch (err) {
        alert('Erro ao analisar receita. Tente novamente.');
        mostrarTela('tela-inicial');
    }
}

// 3. Renderizar Itens
function renderizarLista() {
    listaEl.innerHTML = itensAtuais.map((item, index) => `
        <div class="item-med">
            <div>
                <strong>${item.nome}</strong>
                <small>${item.dosagem} (x${item.qtd})</small>
            </div>
            <button class="btn-remove" onclick="window.removerItem(${index})">✕</button>
        </div>
    `).join('');
}

window.removerItem = (index) => {
    itensAtuais.splice(index, 1);
    renderizarLista();
};

// 4. Confirmar e Salvar no Supabase
window.confirmarPedido = async () => {
    if (itensAtuais.length === 0) return alert('A lista está vazia!');
    
    // Upload da Imagem
    const nomeImg = `rec_${Date.now()}.jpg`;
    await supabase.storage.from('receitas').upload(nomeImg, imagemFile);
    
    const { data: { publicUrl } } = supabase.storage.from('receitas').getPublicUrl(nomeImg);

    // Salvar Pedido
    const senha = `A-${Math.floor(Math.random() * 900) + 100}`;
    
    const { error } = await supabase.from('pedidos').insert({
        senha_curta: senha,
        status: 'novo',
        receita_url: publicUrl,
        itens: itensAtuais
    });

    if (!error) {
        document.getElementById('senha-final').innerText = senha;
        mostrarTela('tela-sucesso');
    }
};

window.novoAtendimento = () => location.reload();

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
