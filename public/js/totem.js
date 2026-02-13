import { supabase } from './supabase.js';

const cameraInput = document.getElementById('cameraInput');
let medicamentosDetectados = [];
let imagemBase64 = null;

// 1. Captura da Imagem
cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    mostrarTela('step-2');

    // Converter para Base64 para enviar para a IA
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        imagemBase64 = reader.result.split(',')[1]; // Remove o header do base64
        
        // Upload da imagem para o Supabase Storage (opcional mas recomendado)
        const fileName = `receita-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase
            .storage.from('receitas').upload(fileName, file);
        
        const imagemUrl = uploadError ? null : fileName;

        // Chamar nossa API Python na Vercel
        analisarImagem(imagemBase64, imagemUrl);
    };
});

// 2. Chama a IA
async function analisarImagem(base64, imagemPath) {
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
        });
        
        const data = await response.json();
        medicamentosDetectados = data.medicamentos || [];
        
        // Renderizar lista
        const lista = document.getElementById('med-list');
        lista.innerHTML = medicamentosDetectados.map(m => 
            `<li>${m.nome} - ${m.dosagem} (Qtd: ${m.qtd})</li>`
        ).join('');
        
        // Salvar referência da imagem para usar no pedido depois
        window.currentImagePath = imagemPath;
        
        mostrarTela('step-3');
    } catch (error) {
        alert("Erro ao analisar. Tente novamente.");
        mostrarTela('step-1');
    }
}

// 3. Confirmar Pedido
window.confirmarPedido = async () => {
    const senha = `A-${Math.floor(Math.random() * 999)}`;
    
    // Salvar no Supabase
    const { error } = await supabase.from('pedidos').insert({
        senha_curta: senha,
        status: 'novo',
        receita_url: window.currentImagePath,
        // Aqui você salvaria os itens na tabela itens_pedido também
    });

    if (!error) {
        document.getElementById('senha-display').innerText = senha;
        mostrarTela('step-4');
    }
};

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}
