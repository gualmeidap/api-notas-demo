from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
import asyncio
import uuid

app = FastAPI(title="Automação Fiscal - Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ==========================================
# BANCOS DE DADOS EM MEMÓRIA (MOCKS)
# ==========================================

PENDING_EMAILS = [
    {
        "id": "mock_1",
        "sender": "faturamento@vivo.com.br",
        "subject": "Fatura Mensal - Internet Fibra",
        "date": datetime.now().isoformat(),
        "attachments": ["fatura.pdf", "nota.xml"],
        "status": "pendente"
    },
    {
        "id": "mock_2",
        "sender": "cobranca@claro.com.br",
        "subject": "Sua Nota Fiscal Eletrônica - Claro Empresas",
        "date": (datetime.now() - timedelta(minutes=45)).isoformat(),
        "attachments": ["NFe_Claro.xml"],
        "status": "pendente"
    }
]

PROCESSED_EMAILS = [
    {
        "id": "mock_3",
        "sender": "amazon@aws.com",
        "subject": "AWS Invoice - May 2026",
        "date": (datetime.now() - timedelta(hours=2)).isoformat(),
        "status": "processado"
    }
]

DELETED_EMAILS = []

EXTRACTED_NFS = [
    {
        "id": "nf_1",
        "data_envio": (datetime.now() - timedelta(hours=2)).isoformat(),
        "unidade": "Matriz SP",
        "fornecedor": "AMAZON AWS",
        "numero_nf": "004892",
        "valor": "R$ 4.500,00",
        "vencimento": (datetime.now() + timedelta(days=10)).isoformat(),
        "descricao": "Serviços de Nuvem",
        "etapa": "fiscal"
    }
]

VENDORS = [
    {"key": "vivo", "nome": "Vivo S.A.", "cnpj": "02.449.992/0001-64", "categoria": "Telecom"},
    {"key": "claro", "nome": "Claro S.A.", "cnpj": "40.432.544/0001-47", "categoria": "Telecom"},
    {"key": "amazon", "nome": "Amazon AWS", "cnpj": "23.414.247/0001-10", "categoria": "Serviços de Nuvem"}
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
async def serve_root():
    return RedirectResponse(url="/notas")

@app.get("/notas", response_class=HTMLResponse)
async def serve_notas(request: Request):
    return templates.TemplateResponse("notas.html", {"request": request, "user": {"username": "Demo User", "role": "admin"}})

@app.get("/fornecedores", response_class=HTMLResponse)
async def serve_fornecedores(request: Request):
    return templates.TemplateResponse("fornecedores.html", {"request": request, "user": {"username": "Demo User", "role": "admin"}})

@app.get("/configuracoes", response_class=HTMLResponse)
async def serve_configuracoes(request: Request):
    return templates.TemplateResponse("configuracoes.html", {"request": request, "user": {"username": "Demo User", "role": "admin"}})

@app.get("/relatorio", response_class=HTMLResponse)
async def serve_relatorio(request: Request):
    return templates.TemplateResponse("relatorio.html", {"request": request, "user": {"username": "Demo User", "role": "admin"}})

@app.get("/logs", response_class=HTMLResponse)
async def serve_logs(request: Request):
    return templates.TemplateResponse("logs.html", {"request": request, "user": {"username": "Demo User", "role": "admin"}})

@app.get("/manual", response_class=HTMLResponse)
async def serve_manual(request: Request):
    return templates.TemplateResponse("manual.html", {"request": request, "user": {"username": "Demo User", "role": "admin"}})

@app.get("/login", response_class=HTMLResponse)
async def serve_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

# ==========================================
# ROTAS DA API (Mapeadas para o frontend)
# ==========================================

@app.get("/api/me")
async def get_me():
    return {"username": "Usuário Demo", "role": "admin", "allowed_mailbox": ""}

@app.post("/api/logout")
async def logout():
    return {"success": True}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/stats")
async def get_stats():
    return {
        "processed_count": len(EXTRACTED_NFS),
        "pending_count": len(PENDING_EMAILS),
        "success_rate": 100 if len(EXTRACTED_NFS) > 0 else 0
    }

@app.get("/api/emails_pendentes")
async def get_pending():
    return PENDING_EMAILS

@app.get("/api/emails_processados")
async def get_processed():
    return PROCESSED_EMAILS

@app.get("/api/emails_extraidos")
async def get_extracted():
    return EXTRACTED_NFS

@app.get("/api/emails/deleted")
async def get_deleted():
    return DELETED_EMAILS

@app.get("/api/logs")
async def get_api_logs():
    return SYSTEM_LOGS

@app.get("/api/vendors")
async def get_vendors():
    return VENDORS

@app.post("/api/monitor/start")
async def monitor_start():
    add_log("Monitoramento automático ATIVADO pelo usuário.", "INFO")
    return {"success": True, "message": "Monitoramento ativado com sucesso"}

@app.post("/api/monitor/stop")
async def monitor_stop():
    add_log("Monitoramento automático DESATIVADO pelo usuário.", "INFO")
    return {"success": True, "message": "Monitoramento desativado com sucesso"}

@app.get("/api/monitor/status")
async def monitor_status():
    return {"running": False}

@app.post("/api/emails/leitura_automatica")
async def read_emails():
    await asyncio.sleep(1)
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
    
    await asyncio.sleep(1.5)
    
    PENDING_EMAILS.remove(email_to_process)
    PROCESSED_EMAILS.insert(0, email_to_process)
    
    EXTRACTED_NFS.insert(0, {
        "id": f"nf_{uuid.uuid4().hex[:4]}",
        "data_envio": datetime.now().isoformat(),
        "unidade": "Filial RJ",
        "fornecedor": email_to_process["sender"].split('@')[1].split('.')[0].upper(),
        "numero_nf": str(uuid.uuid4().int)[:6],
        "valor": "R$ 299,90",
        "vencimento": (datetime.now() + timedelta(days=15)).isoformat(),
        "descricao": f"Serviços extraídos do e-mail: {email_to_process['subject']}",
        "etapa": "compras"
    })
    
    add_log(f"E-mail de {email_to_process['sender']} processado com sucesso.", "SUCCESS")
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
        
    await asyncio.sleep(2)
    
    for file in files_received:
        EXTRACTED_NFS.insert(0, {
            "id": f"nf_{uuid.uuid4().hex[:4]}",
            "data_envio": datetime.now().isoformat(),
            "unidade": "Matriz SP",
            "fornecedor": "UPLOAD MANUAL",
            "numero_nf": str(uuid.uuid4().int)[:6],
            "valor": "R$ 0,00",
            "vencimento": datetime.now().isoformat(),
            "descricao": f"Arquivo: {file.filename} (Destino: {destinatario})",
            "etapa": "compras"
        })
    
    add_log(f"Upload manual processado para {destinatario}.", "SUCCESS")
    return {"success": True, "message": "Arquivos manuais processados!"}

@app.post("/api/process/preview_single")
async def preview_single(id: str):
    return {"html": "<div><h2>Visualização Fake</h2><p>Documento processado com sucesso em modo demonstração.</p></div>"}

@app.post("/api/process/preview_ocr")
async def preview_ocr():
    return {"success": True, "preview_html": "<div><h2>OCR Result</h2><p>Mock OCR extraído.</p></div>"}

@app.post("/api/emails/delete")
async def delete_email(id: str, observation: str = ""):
    email = next((e for e in PENDING_EMAILS if e["id"] == id), None)
    if email:
        PENDING_EMAILS.remove(email)
        DELETED_EMAILS.append(email)
        add_log(f"E-mail {id} excluído.", "INFO")
        return {"success": True}
    return JSONResponse(status_code=404, content={"success": False})

@app.post("/api/emails/restore")
async def restore_email(id: str):
    email = next((e for e in DELETED_EMAILS if e["id"] == id), None)
    if email:
        DELETED_EMAILS.remove(email)
        PENDING_EMAILS.append(email)
        add_log(f"E-mail {id} restaurado.", "INFO")
        return {"success": True}
    return JSONResponse(status_code=404, content={"success": False})

@app.post("/api/workflow/enviar_fiscal")
async def workflow_enviar_fiscal(request: Request):
    return {"success": True, "message": "Enviado para fiscal (Mock)"}

@app.post("/api/workflow/finalizar")
async def workflow_finalizar(request: Request):
    return {"success": True, "message": "Finalizado (Mock)"}

@app.get("/api/debug/simulate_compras/{id}")
async def simulate_compras(id: str):
    return {"success": True}

@app.get("/api/debug/simulate_fiscal/{id}")
async def simulate_fiscal(id: str):
    return {"success": True}

@app.post("/api/debug/simulate_compras_all")
async def simulate_compras_all():
    return {"success": True}

@app.post("/api/debug/simulate_fiscal_all")
async def simulate_fiscal_all():
    return {"success": True}

@app.post("/api/solicitar_nf_faltante/{id}")
async def solicitar_nf(id: str):
    return {"success": True, "message": "Solicitação enviada (Mock)"}