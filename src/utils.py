from fpdf import FPDF

def generate_sample_pdf():
    """Gera um PDF fictício de nota fiscal para teste de forma segura."""
    try:
        pdf = FPDF()
        pdf.add_page()
        
        # Título
        pdf.set_font("helvetica", "B", 16)
        pdf.cell(0, 10, "NOTA FISCAL DE SERVICOS (SIMULACAO)", ln=True, align="C")
        pdf.ln(10)
        
        # Dados fictícios
        pdf.set_font("helvetica", "", 12)
        pdf.cell(0, 10, "Fornecedor: Tech Solutions Demo LTDA", ln=True)
        pdf.cell(0, 10, "Valor: R$ 1.250,00", ln=True)
        pdf.cell(0, 10, "Vencimento: 25/12/2023", ln=True)
        pdf.cell(0, 10, "Status: Aguardando Processamento", ln=True)
        
        # O segredo está aqui: converter o output explicitamente para bytes
        pdf_output = pdf.output()
        
        # Se for fpdf2, o output() pode retornar um bytearray, 
        # o Streamlit aceita, mas converter para bytes() é mais seguro.
        return bytes(pdf_output)
    except Exception as e:
        print(f"Erro ao gerar PDF: {e}")
        return b"" # Retorna um objeto de bytes vazio em caso de erro