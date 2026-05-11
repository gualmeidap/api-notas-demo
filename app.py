import streamlit as st
import pandas as pd
import plotly.express as px
from src.processor import mock_process_invoice
from datetime import datetime
from src.utils import generate_sample_pdf

# Configuração da Página
st.set_page_config(page_title="API Notas - Demo", layout="wide", page_icon="🛡️")

# Estilização customizada para o "Template de E-mail"
st.markdown("""
    <style>
    .email-container {
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        color: #333333;
        font-family: sans-serif;
    }
    .email-header {
        border-bottom: 2px solid #f0f2f6;
        margin-bottom: 15px;
        padding-bottom: 10px;
    }
    .email-label {
        font-weight: bold;
        color: #555555;
    }
    .invoice-card {
        background-color: #f8f9fa;
        border-left: 4px solid #007bff;
        padding: 15px;
        margin-top: 15px;
    }
    </style>
    """, unsafe_allow_html=True)

# Inicialização do Histórico
if 'history' not in st.session_state:
    st.session_state.history = []
if 'logs' not in st.session_state:
    st.session_state.logs = []

def add_log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    st.session_state.logs.append(f"[{timestamp}] {message}")

# Sidebar
with st.sidebar:
    st.title("🛡️ API Notas Demo")
    st.markdown("---")
    st.write("**Tecnologias de Backend:**")
    st.code("Python\nIMAP/SMTP\nOCR/LLM Extraction\nDocker")
    st.info("Esta demo simula a extração de dados e o disparo de alertas para o setor financeiro.")

# Título Principal
st.title("📊 Central de Comando - Automação de Faturas")

tab1, tab2, tab3 = st.tabs(["📤 Processar Documento", "📈 Dashboard Operacional", "📜 Logs do Sistema"])

with tab1:
    st.subheader("Processamento de Documentos")
    
    # Adicionando a opção de baixar exemplo
    col_info, col_btn = st.columns([3, 1])
    with col_info:
        st.write("Não tem uma nota fiscal em PDF agora? Baixe nosso modelo de teste:")
    with col_btn:
        sample_pdf = generate_sample_pdf()
        st.download_button(
            label="📄 Baixar NF Exemplo",
            data=sample_pdf,
            file_name="nf_exemplo_demo.pdf",
            mime="application/pdf",
            use_container_width=True
        )
    
    st.markdown("---") # Divisor visual
    
    uploaded_file = st.file_uploader("Arraste uma NF (PDF) fictícia para testar", type="pdf")
    
    if uploaded_file:
        if st.button("🚀 Iniciar Processamento"):
            with st.spinner("Extraindo dados e validando com o financeiro..."):
                result = mock_process_invoice(uploaded_file.name)
                st.session_state.history.append(result)
                add_log(f"Processado: {result['id']} - Enviado ao financeiro.")
                
                st.success("Processamento concluído! Veja abaixo o e-mail enviado ao setor financeiro:")

                # --- SIMULAÇÃO DE E-MAIL FORMATADO ---
                st.markdown(f"""
                <div class="email-container">
                    <div class="email-header">
                        <span class="email-label">De:</span> automacao-notas@empresa.com.br<br>
                        <span class="email-label">Para:</span> financeiro@empresa.com.br<br>
                        <span class="email-label">Assunto:</span> 🚀 [AUTOMAÇÃO] Nova Fatura Identificada: {result['fornecedor']} ({result['id']})
                    </div>
                    <div>
                        Prezada equipe do financeiro,<br><br>
                        Informamos que uma nova fatura foi identificada e processada automaticamente pelo sistema de monitoramento.<br><br>
                        <strong>Resumo da Extração:</strong>
                        <div class="invoice-card">
                            📌 <b>Fornecedor:</b> {result['fornecedor']}<br>
                            💰 <b>Valor:</b> R$ {result['valor']:,.2f}<br>
                            📅 <b>Vencimento:</b> {result['vencimento']}<br>
                            📄 <b>Arquivo Original:</b> {result['arquivo']}
                        </div>
                        <br>
                        O documento já foi indexado e está pronto para agendamento de pagamento.
                        <br><br>
                        Atenciosamente,<br>
                        <strong>Sentinela API-Notas</strong>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                # --------------------------------------

with tab2:
    st.subheader("Métricas de Eficiência")
    if st.session_state.history:
        df = pd.DataFrame(st.session_state.history)
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.metric("Volume Total (R$)", f"R$ {df['valor'].sum():,.2f}")
            st.metric("Notas Processadas", len(df))
            
        with col2:
            fig = px.pie(df, values='valor', names='fornecedor', title="Distribuição por Fornecedor", hole=.3)
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Aguardando o primeiro processamento para gerar insights.")

with tab3:
    st.subheader("Terminal de Execução (Real-time)")
    if st.session_state.logs:
        for log in reversed(st.session_state.logs):
            st.code(log)
    else:
        st.write("Sistema em standby...")

st.markdown("---")
st.caption("🔒 Demo segura: Nenhuma credencial real ou dado sensível é trafegado nesta aplicação.")