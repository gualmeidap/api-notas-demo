import time
import random

def mock_process_invoice(file_name):
    """
    Simula o processamento de uma Nota Fiscal e extração de dados.
    """
    # Simula um delay de processamento para UX
    time.sleep(1.5)
    
    fornecedores = ["Tech Solutions", "Global Net", "Serviços Digitais LTDA"]
    valor = round(random.uniform(100.0, 2500.0), 2)
    
    return {
        "id": f"NF-{random.randint(1000, 9999)}",
        "fornecedor": random.choice(fornecedores),
        "valor": valor,
        "vencimento": "2026-12-25",
        "status": "Processado",
        "arquivo": file_name
    }