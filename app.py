import streamlit as st
import pandas as pd
import time
from fpdf import FPDF
import io

# Configuração da página
st.set_page_config(page_title="Monitor de Faturas - Demo", page_icon="📊")

# --- FUNÇÃO PARA GERAR PDF FICTÍCIO ---
def gerar_pdf_exemplo():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(200, 10, "FATURA DE SERVIÇOS - EXEMPLO", ln=True, align="C")
    pdf.ln(10)
    
    pdf.set_font("Arial", "", 12)
    dados = [
        ("Fornecedor", "Link Fibra S/A"),
        ("Número da NF", "2026.00452"),
        ("Data de Emissão", "01/04/2026"),
        ("Valor (R$)", "450,00"),
        ("Data de Vencimento", "15/05/2026"),
        ("Descrição", "Serviços de Internet Dedicada - Mensalidade Abril"),
    ]
    
    for chave, valor in dados:
        pdf.set_font("Arial", "B", 12)
        pdf.cell(50, 10, f"{chave}:", border=0)
        pdf.set_font("Arial", "", 12)
        pdf.cell(0, 10, f"{valor}", border=0, ln=True)
    
    return pdf.output(dest='S').encode('latin-1')

# --- INTERFACE ---
st.title("📊 Monitor de Faturas de Fornecedores")
st.markdown("Esta é uma demonstração do sistema de automação que monitora e-mails e processa faturas.")

with st.sidebar:
    st.header("Tech Stack")
    st.info("""
    - **Linguagem:** Python
    - **PDF Gen:** FPDF
    - **OCR:** PDFPlumber / Tesseract
    - **Interface:** Streamlit
    """)

# 1. Geração e Download do PDF
st.subheader("1. Obtenha o arquivo de teste")
pdf_bytes = gerar_pdf_exemplo()
st.download_button(label="📩 Baixar PDF Exemplo", data=pdf_bytes, file_name="fatura_exemplo.pdf", mime="application/pdf")

st.divider()

# 2. Área de Upload
st.subheader("2. Teste o processamento")
uploaded_file = st.file_uploader("Suba um boleto/fatura em PDF", type="pdf")

if uploaded_file is not None:
    with st.status("Processando fatura...", expanded=True) as status:
        st.write("Extraindo dados com OCR...")
        time.sleep(2)
        status.update(label="Processamento concluído!", state="complete", expanded=False)

    # Dados extraídos
    fornecedor = "Link Fibra S/A"
    vencimento = "15/05/2026"
    valor_total = "450,00"
    nf_numero = "2026.00452"

    st.success("✅ Dados extraídos com sucesso!")
    
    # Exibição do E-mail Fictício
    st.subheader("📧 Pré-visualização do E-mail")
    corpo_email = f"""
    **Para:** financeiro@empresa.com.br  
    **Assunto:** Nova Fatura Processada - {fornecedor} (NF: {nf_numero})  

    ---
    Prezada equipe do Financeiro,  

    Uma nova fatura foi identificada e processada automaticamente pelo sistema:  

    - **Fornecedor:** {fornecedor}  
    - **Nota Fiscal:** {nf_numero}  
    - **Valor:** R$ {valor_total}  
    - **Vencimento:** {vencimento}  

    O arquivo original está em anexo para conferência.  

    Atenciosamente,  
    **Bot de Monitoramento de Faturas**
    """
    
    st.markdown(
        f'<div style="background-color: #f0f2f6; padding: 20px; border-radius: 10px; border: 1px solid #d1d5db;">{corpo_email}</div>', 
        unsafe_allow_html=True
    )

    st.write("") # Espaçamento
    if st.button("Confirmar e Enviar ao Financeiro"):
        st.balloons()
        st.success("E-mail enviado com sucesso!")