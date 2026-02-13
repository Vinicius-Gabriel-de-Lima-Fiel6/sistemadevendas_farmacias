from flask import Flask, request, jsonify
import google.generativeai as genai
import os
import json

app = Flask(__name__)

# Configura Gemini (Pegando a chave das variáveis de ambiente da Vercel)
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

@app.route('/api/analyze', methods=['POST'])
def analyze_recipe():
    try:
        # Recebe a imagem (espera um JSON com base64 ou form-data)
        # Para simplificar MVP, vamos assumir que o frontend manda um texto/prompt
        # Mas o ideal é receber o arquivo. Aqui simulamos o processamento.
        
        data = request.json
        image_part = data.get('image') # Base64 string da imagem vinda do front
        
        if not image_part:
            return jsonify({"error": "Nenhuma imagem enviada"}), 400

        # Configura o modelo
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """
        Analise esta receita médica. 
        Retorne APENAS um JSON (sem markdown) com a seguinte estrutura:
        {
            "medicamentos": [
                {"nome": "Nome do remédio", "dosagem": "500mg", "qtd": 1}
            ]
        }
        Se a imagem não for legível, retorne uma lista vazia.
        """

        # O Gemini aceita objetos de imagem, aqui teríamos que converter o base64
        # Para simplificar o código do exemplo, focamos na estrutura:
        response = model.generate_content([prompt, {'mime_type': 'image/jpeg', 'data': image_part}])
        
        # Limpeza básica do JSON retornado pelo Gemini
        text_response = response.text.replace('```json', '').replace('```', '')
        result = json.loads(text_response)
        
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Vercel requer isso para rodar como Serverless
if __name__ == '__main__':
    app.run()
