import streamlit as st
import pandas as pd
import time

# Configuração da página
st.set_page_config(page_title="Monitor de Faturas - Demo", page_icon="📊")

st.title("📊 Monitor de Faturas de Fornecedores")
st.markdown("""
Esta é uma demonstração do sistema de automação que monitora e-mails e processa faturas.
Em vez de conectar seu e-mail real, faça o upload de um PDF fictício abaixo.
""")

# Sidebar com informações técnicas (isso brilha para recrutadores)
with st.sidebar:
    st.header("Tech Stack")
    st.info("""
    - **Linguagem:** Python
    - **OCR:** Tesseract / PDFPlumber
    - **Processamento:** Pandas
    - **Interface:** Streamlit
    """)

# Simulação de Download de arquivo fictício para o usuário testar
st.subheader("1. Teste o sistema")
st.write("Não tem um PDF de fatura aí? Baixe este modelo fictício:")
st.download_button("Baixar PDF Exemplo", data="Conteúdo fake do PDF", file_name="fatura_exemplo.pdf")

# Área de Upload
uploaded_file = st.file_uploader("Suba um boleto/fatura em PDF", type="pdf")

if uploaded_file is not None:
    with st.status("Processando fatura...", expanded=True) as status:
        st.write("Lendo camadas do PDF...")
        time.sleep(1)
        st.write("Extraindo dados com OCR...")
        time.sleep(1.5)
        st.write("Validando fornecedor no dicionário...")
        time.sleep(1)
        status.update(label="Processamento concluído!", state="complete", expanded=False)

    # Simulação dos dados extraídos (Aqui entra a lógica do seu 'dicionário')
    # Na vida real, você usaria o PDFPlumber ou Tesseract aqui.
    dados_extraidos = {
        "Fornecedor": ["Link Fibra S/A"],
        "Vencimento": ["15/05/2026"],
        "Valor (R$)": [450.00],
        "Status": ["Pronto para envio ao Financeiro"]
    }
    
    df = pd.DataFrame(dados_extraidos)
    
    st.success("✅ Dados extraídos com sucesso!")
    st.table(df)

    if st.button("Simular Envio ao Financeiro"):
        st.balloons()
        st.info("E-mail consolidado enviado com sucesso para: financeiro@empresa.com.br")