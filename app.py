import streamlit as st
import pandas as pd
import plotly.express as px
from src.processor import mock_process_invoice
from datetime import datetime

# Configuração da Página
st.set_page_config(page_title="API Notas - Demo", layout="wide")

# Inicialização do Histórico (Simula Banco de Dados)
if 'history' not in st.session_state:
    st.session_state.history = []
if 'logs' not in st.session_state:
    st.session_state.logs = []

def add_log(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    st.session_state.logs.append(f"[{timestamp}] {message}")

# Sidebar - Informações do Projeto
with st.sidebar:
    st.title("🛡️ API Notas Demo")
    st.info("Esta é uma versão demonstrativa para portfólio. Não requer Docker ou SMTP real.")
    st.markdown("---")
    st.write("**Tecnologias:** Python, Streamlit, Mock Logic")

# Título Principal
st.title("📊 Central de Comando - Extração de Notas")

# Abas Principais
tab1, tab2, tab3 = st.tabs(["📤 Extração em Tempo Real", "📈 Dashboard", "📜 Logs do Sistema"])

with tab1:
    st.subheader("Processamento de Documentos")
    uploaded_file = st.file_uploader("Arraste uma NF (PDF) para simular a extração", type="pdf")
    
    if uploaded_file:
        if st.button("🚀 Processar Agora"):
            with st.spinner("Extraindo dados via IA..."):
                result = mock_process_invoice(uploaded_file.name)
                st.session_state.history.append(result)
                add_log(f"Sucesso: {result['id']} processada e enviada ao financeiro.")
                st.success(f"Nota {result['id']} processada com sucesso!")
                st.json(result)

with tab2:
    st.subheader("Métricas de Operação")
    if st.session_state.history:
        df = pd.DataFrame(st.session_state.history)
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Total Processado", len(df))
            st.dataframe(df[["id", "fornecedor", "valor", "vencimento"]])
            
        with col2:
            fig = px.bar(df, x="fornecedor", y="valor", title="Volume por Fornecedor")
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("Nenhum dado processado nesta sessão.")

with tab3:
    st.subheader("Terminal Simulado")
    if st.session_state.logs:
        for log in reversed(st.session_state.logs):
            st.code(log)
    else:
        st.write("Aguardando atividades...")

# Rodapé de Compliance
st.markdown("---")
st.caption("🔒 Dados fictícios utilizados para proteção de sigilo corporativo conforme diretrizes de compliance.")