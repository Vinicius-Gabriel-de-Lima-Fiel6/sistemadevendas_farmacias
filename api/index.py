from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import os, random
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexão Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class PedidoRequest(BaseModel):
    meds_extraidos: List[str]

@app.post("/api/pedidos")
async def criar_pedido(req: PedidoRequest):
    senha = f"RX-{random.randint(100, 999)}"
    
    # 1. Cria o Pedido
    res_pedido = supabase.table("pedidos").insert({"senha": senha}).execute()
    pedido_id = res_pedido.data[0]['id']
    
    total_geral = 0
    
    # 2. Busca cada medicamento no estoque e vincula
    for nome_ocr in req.meds_extraidos:
        # Busca por aproximação (ex: 'Amoxicilina' encontra 'AMOXICILINA 500MG')
        res_prod = supabase.table("produtos").select("*").ilike("nome", f"%{nome_ocr}%").limit(1).execute()
        
        if res_prod.data:
            prod = res_prod.data[0]
            if prod['estoque_atual'] > 0:
                # Adiciona item ao pedido
                supabase.table("itens_pedido").insert({
                    "pedido_id": pedido_id,
                    "produto_id": prod['id'],
                    "preco_unitario": prod['preco']
                }).execute()
                
                # Baixa estoque
                supabase.table("produtos").update({"estoque_atual": prod['estoque_atual'] - 1}).eq("id", prod['id']).execute()
                total_geral += float(prod['preco'])

    # 3. Atualiza o total do pedido
    supabase.table("pedidos").update({"total": total_geral}).eq("id", pedido_id).execute()
    
    return {"id": pedido_id, "senha": senha, "total": total_geral}

@app.get("/api/pedidos")
async def listar_pedidos():
    # Retorna pedidos com os nomes dos produtos relacionados
    res = supabase.table("pedidos").select("*, itens_pedido(preco_unitario, produtos(nome))").order("criado_em", desc=True).execute()
    return res.data

@app.patch("/api/pedidos/{id}")
async def status_pedido(id: int, status_req: dict):
    res = supabase.table("pedidos").update({"status": status_req['status']}).eq("id", id).execute()
    return res.data
