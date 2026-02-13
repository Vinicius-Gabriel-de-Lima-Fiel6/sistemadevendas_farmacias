import { supabase } from './config.js';

const cam = document.getElementById('cam');
let currentMeds = [];
let currentImg = null;

cam.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentImg = file;
    showScreen(2);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ image: base64 })
            });
            const data = await res.json();
            currentMeds = data.medicamentos;
            renderList();
            showScreen(3);
        } catch (err) { alert('Erro na IA'); showScreen(1); }
    };
};

function renderList() {
    const list = document.getElementById('med-list');
    list.innerHTML = currentMeds.map((m, i) => `
        <div class="item-card">
            <span><strong>${m.nome}</strong> - ${m.dosagem}</span>
            <button onclick="window.removeMed(${i})" style="color:red; border:none; background:none; cursor:pointer">Remover</button>
        </div>
    `).join('');
}

window.removeMed = (i) => { currentMeds.splice(i, 1); renderList(); };

document.getElementById('btn-save').onclick = async () => {
    const senha = 'A-' + Math.floor(100 + Math.random() * 900);
    const imgName = `rec-${Date.now()}.jpg`;
    
    await supabase.storage.from('receitas').upload(imgName, currentImg);
    const { data: { publicUrl } } = supabase.storage.from('receitas').getPublicUrl(imgName);

    await supabase.from('pedidos').insert({
        senha_curta: senha,
        itens: currentMeds,
        receita_url: publicUrl
    });

    document.getElementById('senha-val').innerText = senha;
    showScreen(4);
};

function showScreen(n) {
    document.querySelectorAll('.screen').forEach((s, i) => s.classList.toggle('active', i === n-1));
}
