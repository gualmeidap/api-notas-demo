from fpdf import FPDF
import io

def generate_sample_pdf():
    """Gera um PDF fictício de nota fiscal para teste."""
    pdf = FPDF()
    pdf.add_page()
    
    # Cabeçalho
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "NOTA FISCAL DE SERVIÇOS (SIMULAÇÃO)", ln=True, align="C")
    pdf.ln(10)
    
    # Dados do Fornecedor
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Dados do Fornecedor:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, "Razão Social: Tech Solutions Demo LTDA", ln=True)
    pdf.cell(0, 5, "CNPJ: 00.000.000/0001-00", ln=True)
    pdf.ln(5)
    
    # Detalhes da Nota
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Detalhes da Fatura:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, "Número da NF: 4502", ln=True)
    pdf.cell(0, 5, "Valor Total: R$ 1.250,00", ln=True)
    pdf.cell(0, 5, "Vencimento: 25/12/2023", ln=True)
    
    # Retorna os bytes do PDF
    return pdf.output()