from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        img_base64 = data.get('image')
        if not img_base64:
            return jsonify({"error": "Nenhuma imagem enviada"}), 400

        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = "Analise a receita e retorne APENAS um JSON: [{\"nome\": \"...\", \"dosagem\": \"...\", \"qtd\": 1}]. Se não ler nada, retorne []."
        
        response = model.generate_content([
            {'mime_type': 'image/jpeg', 'data': img_base64},
            prompt
        ])
        
        # Limpeza de markdown
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        return jsonify({"medicamentos": json.loads(clean_json)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run()
