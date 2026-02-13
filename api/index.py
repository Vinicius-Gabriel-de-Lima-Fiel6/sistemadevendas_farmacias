from flask import Flask, request, jsonify
import google.generativeai as genai
import os
import json

app = Flask(__name__)

# Configura o Gemini com a chave que colocaremos nos Secrets da Vercel
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        img_base64 = data.get('image')
        
        if not img_base64:
            return jsonify({"error": "Sem imagem"}), 400

        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """
        Analise a receita médica e extraia os nomes dos medicamentos, dosagens e quantidades.
        Retorne APENAS um JSON puro no seguinte formato:
        [{"nome": "Remédio X", "dosagem": "500mg", "qtd": 1}]
        Se não conseguir ler nada, retorne []. Não use markdown.
        """

        response = model.generate_content([
            {'mime_type': 'image/jpeg', 'data': img_base64},
            prompt
        ])
        
        # Limpa possíveis blocos de código markdown que a IA possa gerar
        json_text = response.text.replace('```json', '').replace('```', '').strip()
        return jsonify({"medicamentos": json.loads(json_text)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
