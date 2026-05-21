from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
import asyncio
import uuid

app = FastAPI(title="API Notas - Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restrinja para o seu domínio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração de Templates (Seu HTML vai na pasta 'templates')
templates = Jinja2Templates(directory="templates")

# ==========================================
# BANCOS DE DADOS EM MEMÓRIA (MOCKS)
# ==========================================

PENDING_EMAILS = [
    {
        "id": "mock_1",
        "sender": "faturamento@vivo.com.br",
        "subject": "Fatura Mensal - Internet Fibra",
        "date": datetime.now().isoformat()
    },
    {
        "id": "mock_2",
        "sender": "cobranca@claro.com.br",
        "subject": "Sua Nota Fiscal Eletrônica - Claro Empresas",
        "date": (datetime.now() - timedelta(minutes=45)).isoformat()
    }
]

PROCESSED_EMAILS = [
    {
        "sender": "amazon@aws.com",
        "subject": "AWS Invoice - May 2026",
        "date": (datetime.now() - timedelta(hours=2)).isoformat()
    }
]

EXTRACTED_NFS = [
    {
        "data_envio": (datetime.now() - timedelta(hours=2)).isoformat(),
        "unidade": "Matriz SP",
        "fornecedor": "AMAZON AWS",
        "numero_nf": "004892",
        "valor": "R$ 4.500,00",
        "vencimento": (datetime.now() + timedelta(days=10)).isoformat(),
        "descricao": "Serviços de Nuvem"
    }
]

SYSTEM_LOGS = [
    {"timestamp": datetime.now().isoformat(), "level": "SUCCESS", "message": "Sistema inicializado. Ambiente de demonstração ativo e rodando em memória."}
]

def add_log(message: str, level: str = "INFO"):
    SYSTEM_LOGS.insert(0, {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "message": message
    })

# ==========================================
# ROTAS DA INTERFACE (UI)
# ==========================================

@app.get("/", response_class=HTMLResponse)
async def serve_frontend(request: Request):
    """Renderiza a interface principal"""
    return templates.TemplateResponse("email_manager.html", {"request": request})

# ==========================================
# ROTAS DA API (Mapeadas para o frontend)
# ==========================================

@app.get("/api/stats")
async def get_stats():
    return {
        "processed_count": len(EXTRACTED_NFS),
        "pending_count": len(PENDING_EMAILS),
        "success_rate": 100 if len(EXTRACTED_NFS) > 0 else 0
    }

@app.get("/api/emails_pendentes")
async def get_pending():
    # O JS espera a lista direto
    return PENDING_EMAILS

@app.get("/api/emails_processados")
async def get_processed():
    return PROCESSED_EMAILS

@app.get("/api/emails_extraidos")
async def get_extracted():
    return EXTRACTED_NFS

@app.get("/api/logs")
async def get_logs():
    return SYSTEM_LOGS

@app.post("/api/monitor/start")
async def monitor_start():
    add_log("Monitoramento automático ATIVADO pelo usuário.", "INFO")
    return {"success": True, "message": "Monitoramento ativado com sucesso"}

@app.post("/api/monitor/stop")
async def monitor_stop():
    add_log("Monitoramento automático DESATIVADO pelo usuário.", "INFO")
    return {"success": True, "message": "Monitoramento desativado com sucesso"}

@app.post("/api/emails/leitura_automatica")
async def read_emails():
    await asyncio.sleep(1) # Simula o delay da rede
    novo_email = {
        "id": f"mock_{uuid.uuid4().hex[:4]}",
        "sender": "contato@fornecedor.com.br",
        "subject": "Nota Fiscal Eletrônica - Serviço",
        "date": datetime.now().isoformat()
    }
    PENDING_EMAILS.insert(0, novo_email)
    add_log("Caixa de entrada verificada. 1 novo e-mail encontrado.", "INFO")
    return {"success": True, "message": "Caixa lida! 1 novo e-mail encontrado."}

@app.post("/api/process/single")
async def process_single(id: str):
    email_to_process = next((e for e in PENDING_EMAILS if e["id"] == id), None)
    
    if not email_to_process:
        return JSONResponse(status_code=404, content={"success": False, "error": "E-mail não encontrado."})
    
    await asyncio.sleep(1.5) # Simula extração OCR
    
    # Move de Pendente para Processado
    PENDING_EMAILS.remove(email_to_process)
    PROCESSED_EMAILS.insert(0, email_to_process)
    
    # Gera a NF fictícia extraída
    EXTRACTED_NFS.insert(0, {
        "data_envio": datetime.now().isoformat(),
        "unidade": "Filial RJ",
        "fornecedor": email_to_process["sender"].split('@')[1].split('.')[0].upper(),
        "numero_nf": str(uuid.uuid4().int)[:6],
        "valor": "R$ 299,90",
        "vencimento": (datetime.now() + timedelta(days=15)).isoformat(),
        "descricao": f"Serviços extraídos do e-mail: {email_to_process['subject']}"
    })
    
    add_log(f"E-mail de {email_to_process['sender']} processado e dados extraídos com sucesso.", "SUCCESS")
    return {"success": True, "message": "E-mail processado e extraído com sucesso!"}

@app.post("/api/processar_fila")
async def process_queue():
    if not PENDING_EMAILS:
        return {"success": True, "message": "A fila já está vazia."}
    
    await asyncio.sleep(2)
    quantidade = len(PENDING_EMAILS)
    
    for email in list(PENDING_EMAILS):
        await process_single(email["id"])
        
    add_log(f"Fila de {quantidade} e-mails processada em lote.", "SUCCESS")
    return {"success": True, "message": f"{quantidade} e-mails processados da fila."}

@app.post("/api/process/manual")
async def process_manual(request: Request):
    form = await request.form()
    files_received = [v for k, v in form.items() if k.startswith("file_")]
    destinatario = form.get("destinatario", "Desconhecido")
    
    if not files_received:
        return JSONResponse(status_code=400, content={"success": False, "message": "Nenhum arquivo."})
        
    await asyncio.sleep(2) # Efeito visual de loading
    
    for file in files_received:
        EXTRACTED_NFS.insert(0, {
            "data_envio": datetime.now().isoformat(),
            "unidade": "Matriz SP",
            "fornecedor": "UPLOAD MANUAL",
            "numero_nf": str(uuid.uuid4().int)[:6],
            "valor": "R$ 0,00",
            "vencimento": datetime.now().isoformat(),
            "descricao": f"Arquivo: {file.filename} (Destino: {destinatario})"
        })
    
    add_log(f"Upload manual de {len(files_received)} documento(s) enviado para {destinatario}.", "SUCCESS")
    return {"success": True, "message": "Arquivos manuais processados!"}