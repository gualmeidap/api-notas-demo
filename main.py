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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

DEMO_USER = {"username": "Demo User", "role": "admin"}

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
        "status": "pendente",
        "mailbox": "compras@empresa.demo.com.br"
    },
    {
        "id": "mock_2",
        "sender": "cobranca@claro.com.br",
        "subject": "Sua Nota Fiscal Eletrônica - Claro Empresas",
        "date": (datetime.now() - timedelta(minutes=45)).isoformat(),
        "attachments": ["NFe_Claro.xml"],
        "status": "pendente",
        "mailbox": "compras@empresa.demo.com.br"
    },
    {
        "id": "mock_4",
        "sender": "nfe@totvs.com.br",
        "subject": "NF-e 118422 - Licenciamento de Software",
        "date": (datetime.now() - timedelta(hours=3)).isoformat(),
        "attachments": ["NFe_118422.pdf"],
        "status": "pendente",
        "mailbox": "contratos.ti@filial.demo.com.br"
    }
]

PROCESSED_EMAILS = [
    {
        "id": "mock_3",
        "sender": "amazon@aws.com",
        "fornecedor": "AMAZON AWS",
        "subject": "AWS Invoice - May 2026",
        "date": (datetime.now() - timedelta(hours=2)).isoformat(),
        "status": "processado",
        "process_type": "Automático",
        "observation": "Encaminhado ao setor fiscal",
        "mailbox": "fiscal@empresa.demo.com.br"
    },
    {
        "id": "mock_5",
        "sender": "faturamento@sabesp.com.br",
        "fornecedor": "SABESP",
        "subject": "Conta de Água - Unidade Matriz",
        "date": (datetime.now() - timedelta(days=1)).isoformat(),
        "status": "processado",
        "process_type": "Massa",
        "observation": "Rateio por unidade aplicado",
        "mailbox": "contratos.ti@filial.demo.com.br"
    },
    {
        "id": "mock_6",
        "sender": "financeiro@tecnoprint.com.br",
        "fornecedor": "TECNOPRINT",
        "subject": "NF 90233 - Locação de Impressoras",
        "date": (datetime.now() - timedelta(days=2)).isoformat(),
        "status": "processado",
        "process_type": "Manual",
        "observation": "Upload manual pelo setor de compras",
        "mailbox": "compras@empresa.demo.com.br"
    }
]

DELETED_EMAILS = [
    {
        "id": "mock_7",
        "sender": "marketing@fornecedor.com.br",
        "fornecedor": "N/A",
        "subject": "Catálogo de Produtos 2026",
        "date": (datetime.now() - timedelta(days=3)).isoformat(),
        "status": "excluido",
        "observation": "E-mail sem nota fiscal anexa",
        "mailbox": "compras@empresa.demo.com.br"
    }
]

EXTRACTED_NFS = [
    {
        "id": "nf_1",
        "data_envio": (datetime.now() - timedelta(hours=2)).isoformat(),
        "unidade": "Matriz",
        "fornecedor": "AMAZON AWS",
        "numero_nf": "004892",
        "valor": "R$ 4.500,00",
        "vencimento": (datetime.now() + timedelta(days=10)).isoformat(),
        "descricao": "Serviços de Nuvem",
        "status": "Aguardando Fiscal",
        "mailbox": "fiscal@empresa.demo.com.br",
        "numero_pedido": "PC-20418",
        "data_envio_compras": (datetime.now() - timedelta(hours=2)).isoformat()
    },
    {
        "id": "nf_2",
        "data_envio": (datetime.now() - timedelta(hours=6)).isoformat(),
        "unidade": "Filial Norte/SP",
        "fornecedor": "SABESP",
        "numero_nf": "778120",
        "valor": "R$ 1.238,45",
        "vencimento": (datetime.now() + timedelta(days=6)).isoformat(),
        "descricao": "Fornecimento de Água e Esgoto",
        "status": "Aguardando Compras",
        "mailbox": "contratos.ti@filial.demo.com.br",
        "numero_pedido": "-"
    },
    {
        "id": "nf_3",
        "data_envio": (datetime.now() - timedelta(hours=9)).isoformat(),
        "unidade": "Matriz",
        "fornecedor": "TECNOPRINT",
        "numero_nf": "090233",
        "valor": "R$ 2.870,00",
        "vencimento": (datetime.now() + timedelta(days=18)).isoformat(),
        "descricao": "Locação de Equipamentos de Impressão",
        "status": "Concluído",
        "mailbox": "compras@empresa.demo.com.br",
        "numero_pedido": "PC-20377",
        "data_envio_compras": (datetime.now() - timedelta(days=2)).isoformat(),
        "data_envio_fiscal": (datetime.now() - timedelta(days=1)).isoformat()
    }
]

# Mapa chave -> dados. Unidades com "/UF" são exibidas na aba Filial.
VENDORS = {
    "VIVO": {"fornecedor": "Vivo S.A.", "unidade": "Matriz", "cnpj": "02.449.992/0001-64", "categoria": "Telecom"},
    "CLARO": {"fornecedor": "Claro S.A.", "unidade": "Matriz", "cnpj": "40.432.544/0001-47", "categoria": "Telecom"},
    "AMAZON": {"fornecedor": "Amazon AWS", "unidade": "Matriz", "cnpj": "23.414.247/0001-10", "categoria": "Serviços de Nuvem"},
    "SABESP": {"fornecedor": "Sabesp", "unidade": "Filial Norte/SP", "cnpj": "43.776.517/0001-80", "categoria": "Utilidades"},
    "TECNOPRINT": {"fornecedor": "Tecnoprint Serviços", "unidade": "Filial Sul/RS", "cnpj": "11.222.333/0001-44", "categoria": "Locação"}
}

USERS = [
    {"id": 1, "username": "admin.demo", "role": "admin", "allowed_mailbox": None},
    {"id": 2, "username": "compras.operador", "role": "tecnico", "allowed_mailbox": "compras@empresa.demo.com.br"},
    {"id": 3, "username": "fiscal.operador", "role": "tecnico", "allowed_mailbox": "fiscal@empresa.demo.com.br"}
]

AUDIT_LOGS = [
    {
        "created_at": (datetime.now() - timedelta(minutes=12)).isoformat(),
        "admin_username": "admin.demo",
        "action": "LOGIN",
        "target_resource": "sessão",
        "details": "Acesso ao painel de demonstração"
    },
    {
        "created_at": (datetime.now() - timedelta(hours=4)).isoformat(),
        "admin_username": "admin.demo",
        "action": "UPDATE_CONFIG",
        "target_resource": "roteamento",
        "details": "Destinatários do setor fiscal atualizados"
    },
    {
        "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "admin_username": "admin.demo",
        "action": "CREATE_USER",
        "target_resource": "fiscal.operador",
        "details": "Usuário criado com acesso restrito a uma caixa"
    },
    {
        "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
        "admin_username": "admin.demo",
        "action": "DELETE_EMAIL",
        "target_resource": "mock_7",
        "details": "E-mail sem nota fiscal movido para a lixeira"
    }
]

CONFIG = {
    "current_mailbox": "compras@empresa.demo.com.br",
    "compras_emails": "compras@empresa.demo.com.br, suprimentos@empresa.demo.com.br",
    "fiscal_emails": "fiscal@empresa.demo.com.br",
    "enable_email_reading": True,
    "enable_email_sending": False
}

DESCRICOES = {
    "mapa": {
        "VIVO": {
            "default": "Serviços de Telecomunicações",
            "valores": {"Fibra": "Link Dedicado de Internet", "Movel": "Telefonia Móvel Corporativa"}
        },
        "AMAZON": {
            "default": "Serviços de Computação em Nuvem",
            "valores": {"EC2": "Infraestrutura de Servidores", "S3": "Armazenamento de Objetos"}
        },
        "SABESP": {
            "default": "Fornecimento de Água e Esgoto",
            "valores": {}
        }
    },
    "normalizacao": {
        "VIVO S.A.": "VIVO",
        "TELEFONICA BRASIL SA": "VIVO",
        "CLARO NXT TELECOMUNICACOES": "CLARO",
        "AMAZON WEB SERVICES BRASIL": "AMAZON"
    }
}

REPORT_VENDORS = [
    {"nome": "Vivo S.A.", "email": "faturamento@vivo.com.br", "qtd_emails": 24, "tem_nf": True, "tem_boleto": True, "mailbox": "compras@empresa.demo.com.br"},
    {"nome": "Claro S.A.", "email": "cobranca@claro.com.br", "qtd_emails": 18, "tem_nf": True, "tem_boleto": True, "mailbox": "compras@empresa.demo.com.br"},
    {"nome": "Amazon AWS", "email": "amazon@aws.com", "qtd_emails": 12, "tem_nf": True, "tem_boleto": False, "mailbox": "fiscal@empresa.demo.com.br"},
    {"nome": "Sabesp", "email": "faturamento@sabesp.com.br", "qtd_emails": 9, "tem_nf": True, "tem_boleto": True, "mailbox": "contratos.ti@filial.demo.com.br"},
    {"nome": "Tecnoprint Serviços", "email": "financeiro@tecnoprint.com.br", "qtd_emails": 6, "tem_nf": False, "tem_boleto": True, "mailbox": "contratos.ti@filial.demo.com.br"}
]

SYSTEM_LOGS = [
    {"timestamp": datetime.now().isoformat(), "level": "SUCCESS", "message": "Sistema inicializado. Ambiente de demonstração ativo e rodando em memória."}
]

CAIXAS_MONITORADAS = [
    "compras@empresa.demo.com.br",
    "fiscal@empresa.demo.com.br",
    "contratos.ti@filial.demo.com.br",
]

def por_caixa(itens: list, mailbox_filter: str = "") -> list:
    """Filtra pela caixa selecionada no seletor do topo. Vazio = todas."""
    if not mailbox_filter:
        return itens
    return [i for i in itens if i.get("mailbox") == mailbox_filter]

def add_log(message: str, level: str = "INFO"):
    SYSTEM_LOGS.insert(0, {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "message": message
    })

def add_audit(action: str, target_resource: str = "", details: str = ""):
    AUDIT_LOGS.insert(0, {
        "created_at": datetime.now().isoformat(),
        "admin_username": USERS[0]["username"] if USERS else "admin.demo",
        "action": action,
        "target_resource": target_resource,
        "details": details
    })

# ==========================================
# ROTAS DA INTERFACE (UI)
# ==========================================

def render(request: Request, template: str):
    return templates.TemplateResponse(template, {"request": request, "user": DEMO_USER})

@app.get("/")
async def serve_root():
    return RedirectResponse(url="/notas")

@app.get("/notas", response_class=HTMLResponse)
async def serve_notas(request: Request):
    return render(request, "notas.html")

@app.get("/historico", response_class=HTMLResponse)
async def serve_historico(request: Request):
    return render(request, "historico.html")

@app.get("/envio-manual", response_class=HTMLResponse)
async def serve_envio_manual(request: Request):
    return render(request, "manual.html")

@app.get("/manual")
async def serve_manual_legacy():
    return RedirectResponse(url="/envio-manual")

@app.get("/fornecedores", response_class=HTMLResponse)
async def serve_fornecedores(request: Request):
    return render(request, "fornecedores.html")

@app.get("/descricoes", response_class=HTMLResponse)
async def serve_descricoes(request: Request):
    return render(request, "descricoes.html")

@app.get("/relatorio", response_class=HTMLResponse)
async def serve_relatorio(request: Request):
    return render(request, "relatorio.html")

@app.get("/configuracoes", response_class=HTMLResponse)
async def serve_configuracoes(request: Request):
    return render(request, "configuracoes.html")

@app.get("/usuarios", response_class=HTMLResponse)
async def serve_usuarios(request: Request):
    return render(request, "usuarios.html")

@app.get("/auditoria", response_class=HTMLResponse)
async def serve_auditoria(request: Request):
    return render(request, "auditoria.html")

@app.get("/logs", response_class=HTMLResponse)
async def serve_logs(request: Request):
    return render(request, "logs.html")

@app.get("/login", response_class=HTMLResponse)
async def serve_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

# ==========================================
# ROTAS DA API (Mapeadas para o frontend)
# ==========================================

@app.post("/api/login")
async def login(request: Request):
    body = await request.json()
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    # Ambiente de demonstração: qualquer credencial preenchida é aceita.
    if not username or not password:
        return JSONResponse(status_code=401, content={"detail": "Informe usuário e senha."})

    add_audit("LOGIN", "sessão", f"Acesso de '{username}' ao ambiente de demonstração")
    add_log(f"Login realizado por '{username}'.", "SUCCESS")
    return {"success": True, "username": username, "role": "admin"}

@app.get("/api/me")
async def get_me():
    return {"username": DEMO_USER["username"], "role": DEMO_USER["role"], "allowed_mailbox": ""}

@app.post("/api/logout")
async def logout():
    return {"success": True}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/stats")
async def get_stats(mailbox_filter: str = ""):
    # Série sintética e estável para o gráfico do mês: a demo não acumula
    # histórico real, então o mês inteiro é preenchido para o gráfico ter forma.
    chart_by_day = {str(dia): (dia * 7 % 9) + 1 for dia in range(1, 29)}

    pendentes = por_caixa(PENDING_EMAILS, mailbox_filter)
    processados = por_caixa(PROCESSED_EMAILS, mailbox_filter)
    extraidas = por_caixa(EXTRACTED_NFS, mailbox_filter)

    breakdown = {"Automático": 0, "Manual": 0, "Massa": 0, "Único": 0}
    for email in processados:
        tipo = email.get("process_type", "Automático")
        breakdown[tipo] = breakdown.get(tipo, 0) + 1

    status_breakdown = {"Pendente": len(pendentes), "Aguardando Compras": 0, "Aguardando Fiscal": 0, "Concluído": 0}
    for nf in extraidas:
        rotulo = nf.get("status", "Aguardando Compras")
        status_breakdown[rotulo] = status_breakdown.get(rotulo, 0) + 1

    return {
        "processed_count": len(processados),
        "processed_current_month": len(processados),
        "pending_count": len(pendentes),
        "success_rate": 100 if extraidas else 0,
        "process_type_breakdown": breakdown,
        "chart_processed_by_day": chart_by_day,
        "status_breakdown": status_breakdown
    }

@app.get("/api/emails_pendentes")
async def get_pending(mailbox_filter: str = ""):
    return por_caixa(PENDING_EMAILS, mailbox_filter)

@app.get("/api/emails_processados")
async def get_processed(mailbox_filter: str = ""):
    return por_caixa(PROCESSED_EMAILS, mailbox_filter)

@app.get("/api/emails_extraidos")
async def get_extracted(mailbox_filter: str = ""):
    return por_caixa(EXTRACTED_NFS, mailbox_filter)

@app.get("/api/emails/deleted")
async def get_deleted(mailbox_filter: str = ""):
    return por_caixa(DELETED_EMAILS, mailbox_filter)

@app.get("/api/logs")
async def get_api_logs():
    return SYSTEM_LOGS

@app.get("/api/audit-logs")
async def get_audit_logs():
    return AUDIT_LOGS

# ------------------------------------------
# Configurações
# ------------------------------------------

@app.get("/api/config")
async def get_config(mailbox_filter: str = ""):
    config = dict(CONFIG)
    if mailbox_filter:
        config["current_mailbox"] = mailbox_filter
    return config

@app.put("/api/config")
async def update_config(request: Request):
    body = await request.json()
    for campo in ("compras_emails", "fiscal_emails", "enable_email_reading", "enable_email_sending"):
        if campo in body:
            CONFIG[campo] = body[campo]

    add_audit("UPDATE_CONFIG", "configurações", "Parâmetros de roteamento e serviços atualizados")
    add_log("Configurações do sistema atualizadas.", "SUCCESS")
    return {"success": True, "message": "Configurações salvas"}

# ------------------------------------------
# Usuários
# ------------------------------------------

@app.get("/api/users")
async def get_users():
    return USERS

@app.post("/api/users")
async def create_user(request: Request):
    body = await request.json()
    username = (body.get("username") or "").strip()

    if not username or not body.get("password"):
        return JSONResponse(status_code=400, content={"detail": "Usuário e senha são obrigatórios."})
    if any(u["username"].lower() == username.lower() for u in USERS):
        return JSONResponse(status_code=409, content={"detail": "Já existe um usuário com esse nome."})

    novo = {
        "id": max((u["id"] for u in USERS), default=0) + 1,
        "username": username,
        "role": body.get("role", "tecnico"),
        "allowed_mailbox": body.get("allowed_mailbox")
    }
    USERS.append(novo)
    add_audit("CREATE_USER", username, f"Usuário criado com perfil '{novo['role']}'")
    add_log(f"Usuário '{username}' criado.", "SUCCESS")
    return novo

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, request: Request):
    usuario = next((u for u in USERS if u["id"] == user_id), None)
    if not usuario:
        return JSONResponse(status_code=404, content={"detail": "Usuário não encontrado."})

    body = await request.json()
    if body.get("password"):
        add_audit("RESET_PASSWORD", usuario["username"], "Senha redefinida pelo administrador")
        add_log(f"Senha do usuário '{usuario['username']}' redefinida.", "INFO")

    for campo in ("role", "allowed_mailbox"):
        if campo in body:
            usuario[campo] = body[campo]

    return {"success": True, "user": usuario}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    usuario = next((u for u in USERS if u["id"] == user_id), None)
    if not usuario:
        return JSONResponse(status_code=404, content={"detail": "Usuário não encontrado."})
    if usuario["role"] == "admin" and sum(1 for u in USERS if u["role"] == "admin") == 1:
        return JSONResponse(status_code=400, content={"detail": "Não é possível excluir o último administrador."})

    USERS.remove(usuario)
    add_audit("DELETE_USER", usuario["username"], "Usuário removido do sistema")
    add_log(f"Usuário '{usuario['username']}' excluído.", "INFO")
    return {"success": True}

# ------------------------------------------
# Fornecedores
# ------------------------------------------

@app.get("/api/vendors")
async def get_vendors():
    return VENDORS

@app.post("/api/vendors")
async def create_vendor(request: Request):
    body = await request.json()
    key = (body.get("key") or "").strip().upper()
    if not key:
        return JSONResponse(status_code=400, content={"detail": "A chave do fornecedor é obrigatória."})

    VENDORS[key] = {"fornecedor": body.get("fornecedor", key), "unidade": body.get("unidade", "Matriz")}
    add_audit("CREATE_VENDOR", key, "Fornecedor adicionado ao dicionário")
    add_log(f"Fornecedor '{key}' adicionado ao dicionário.", "SUCCESS")
    return {"success": True, "key": key}

@app.post("/api/vendors/{key}")
async def save_vendor(key: str, request: Request):
    body = await request.json()
    ja_existia = key in VENDORS

    VENDORS[key] = {
        "fornecedor": body.get("fornecedor", key),
        "unidade": body.get("unidade", "Matriz")
    }
    add_audit("UPDATE_VENDOR" if ja_existia else "CREATE_VENDOR", key, f"Unidade: {VENDORS[key]['unidade'] or '-'}")
    add_log(f"Fornecedor '{key}' salvo.", "SUCCESS")
    return {"success": True, "key": key}

@app.delete("/api/vendors/{key}")
async def delete_vendor(key: str):
    if key not in VENDORS:
        return JSONResponse(status_code=404, content={"detail": "Fornecedor não encontrado."})

    del VENDORS[key]
    add_audit("DELETE_VENDOR", key, "Fornecedor removido do dicionário")
    add_log(f"Fornecedor '{key}' excluído.", "INFO")
    return {"success": True}

@app.post("/api/ai/extract_vendor")
async def extract_vendor(request: Request):
    form = await request.form()
    arquivo = form.get("file")
    if arquivo is None:
        return JSONResponse(status_code=400, content={"detail": "Nenhum arquivo enviado."})

    await asyncio.sleep(2)
    add_log(f"Extração assistida executada sobre '{arquivo.filename}'.", "INFO")
    return {
        "chave_normalizada": "TECNOPRINT",
        "razao_social": "TECNOPRINT SERVICOS GRAFICOS LTDA",
        "nome_fantasia": "Tecnoprint Serviços",
        "unidade": "Filial Sul/RS",
        "cnpj": "11.222.333/0001-44"
    }

# ------------------------------------------
# Descrições e normalizações
# ------------------------------------------

@app.get("/api/descricoes")
async def get_descricoes():
    return DESCRICOES

@app.post("/api/descricoes/mapa")
async def save_mapa(request: Request):
    body = await request.json()
    key = (body.get("fornecedor") or "").strip().upper()
    if not key:
        return JSONResponse(status_code=400, content={"detail": "A chave do fornecedor é obrigatória."})

    DESCRICOES["mapa"][key] = {
        "default": body.get("default_desc", ""),
        "valores": body.get("valores", {})
    }
    add_audit("UPDATE_DESCRICAO", key, "Mapeamento de descrição salvo")
    add_log(f"Mapeamento de descrição de '{key}' salvo.", "SUCCESS")
    return {"success": True}

@app.delete("/api/descricoes/mapa/{key}")
async def delete_mapa(key: str):
    if key not in DESCRICOES["mapa"]:
        return JSONResponse(status_code=404, content={"detail": "Mapeamento não encontrado."})

    del DESCRICOES["mapa"][key]
    add_audit("DELETE_DESCRICAO", key, "Mapeamento de descrição removido")
    return {"success": True}

@app.post("/api/descricoes/normalizacao")
async def save_normalizacao(request: Request):
    body = await request.json()
    original = (body.get("nome_original") or "").strip()
    padrao = (body.get("nome_padrao") or "").strip()
    if not original or not padrao:
        return JSONResponse(status_code=400, content={"detail": "Informe o nome original e o nome padrão."})

    DESCRICOES["normalizacao"][original] = padrao
    add_audit("UPDATE_NORMALIZACAO", original, f"Normalizado para '{padrao}'")
    return {"success": True}

@app.delete("/api/descricoes/normalizacao/{original}")
async def delete_normalizacao(original: str):
    if original not in DESCRICOES["normalizacao"]:
        return JSONResponse(status_code=404, content={"detail": "Normalização não encontrada."})

    del DESCRICOES["normalizacao"][original]
    add_audit("DELETE_NORMALIZACAO", original, "Normalização removida")
    return {"success": True}

# ------------------------------------------
# Relatório
# ------------------------------------------

@app.get("/api/relatorio/fornecedores")
async def get_relatorio_fornecedores():
    return REPORT_VENDORS

# ------------------------------------------
# Monitoramento e processamento
# ------------------------------------------

@app.post("/api/monitor/start")
async def monitor_start(mailbox_filter: str = ""):
    alvo = mailbox_filter or "todas as caixas"
    add_log(f"Monitoramento automático ATIVADO pelo usuário ({alvo}).", "INFO")
    return {"success": True, "message": "Monitoramento ativado com sucesso"}

@app.post("/api/monitor/stop")
async def monitor_stop(mailbox_filter: str = ""):
    alvo = mailbox_filter or "todas as caixas"
    add_log(f"Monitoramento automático DESATIVADO pelo usuário ({alvo}).", "INFO")
    return {"success": True, "message": "Monitoramento desativado com sucesso"}

@app.get("/api/monitor/status")
async def monitor_status():
    return {"running": False}

@app.post("/api/emails/leitura_automatica")
async def read_emails(mailbox_filter: str = ""):
    await asyncio.sleep(1)
    novo_email = {
        "id": f"mock_{uuid.uuid4().hex[:4]}",
        "sender": "contato@fornecedor.com.br",
        "subject": "Nota Fiscal Eletrônica - Serviço",
        "date": datetime.now().isoformat(),
        "mailbox": mailbox_filter or CAIXAS_MONITORADAS[0]
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

    fornecedor = email_to_process["sender"].split('@')[1].split('.')[0].upper()
    caixa = email_to_process.get("mailbox", CAIXAS_MONITORADAS[0])

    PENDING_EMAILS.remove(email_to_process)
    email_to_process["fornecedor"] = fornecedor
    email_to_process["process_type"] = "Único"
    PROCESSED_EMAILS.insert(0, email_to_process)

    EXTRACTED_NFS.insert(0, {
        "id": f"nf_{uuid.uuid4().hex[:4]}",
        "data_envio": datetime.now().isoformat(),
        "unidade": "Filial Norte/SP",
        "fornecedor": fornecedor,
        "numero_nf": str(uuid.uuid4().int)[:6],
        "valor": "R$ 299,90",
        "vencimento": (datetime.now() + timedelta(days=15)).isoformat(),
        "descricao": f"Serviços extraídos do e-mail: {email_to_process['subject']}",
        "status": "Aguardando Compras",
        "mailbox": caixa,
        "numero_pedido": "-"
    })

    add_log(f"E-mail de {email_to_process['sender']} processado com sucesso.", "SUCCESS")
    return {"success": True, "message": "E-mail processado e extraído com sucesso!"}

@app.post("/api/processar_fila")
async def process_queue(mailbox_filter: str = ""):
    fila = por_caixa(PENDING_EMAILS, mailbox_filter)
    if not fila:
        return {"success": True, "message": "A fila já está vazia."}

    await asyncio.sleep(2)
    quantidade = len(fila)

    for email in list(fila):
        await process_single(email["id"])

    add_log(f"Fila de {quantidade} e-mails processada em lote.", "SUCCESS")
    return {"success": True, "message": f"{quantidade} e-mails processados da fila."}

@app.post("/api/process/manual")
async def process_manual(request: Request, mailbox_filter: str = ""):
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
            "unidade": "Matriz",
            "fornecedor": "UPLOAD MANUAL",
            "numero_nf": str(uuid.uuid4().int)[:6],
            "valor": "R$ 0,00",
            "vencimento": datetime.now().isoformat(),
            "descricao": f"Arquivo: {file.filename} (Destino: {destinatario})",
            "status": "Aguardando Compras",
            "mailbox": mailbox_filter or CAIXAS_MONITORADAS[0],
            "numero_pedido": "-"
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
        email["observation"] = observation
        DELETED_EMAILS.append(email)
        add_log(f"E-mail {id} excluído.", "INFO")
        add_audit("DELETE_EMAIL", id, observation or "E-mail movido para a lixeira")
        return {"success": True}
    return JSONResponse(status_code=404, content={"success": False})

@app.post("/api/emails/restore")
async def restore_email(id: str):
    email = next((e for e in DELETED_EMAILS if e["id"] == id), None)
    if email:
        DELETED_EMAILS.remove(email)
        PENDING_EMAILS.append(email)
        add_log(f"E-mail {id} restaurado.", "INFO")
        add_audit("RESTORE_EMAIL", id, "E-mail restaurado para a fila")
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
