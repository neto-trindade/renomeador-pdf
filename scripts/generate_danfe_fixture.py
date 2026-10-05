"""Create a fictional DANFE header for issuer-name extraction regression tests."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parents[1]


def access_key():
    digits = "292610" + "00000000000000" + "55" + "001" + "000013913" + "1" + "00000001"
    total = sum(int(digit) * (2 + index % 8) for index, digit in enumerate(reversed(digits)))
    remainder = total % 11
    return digits + str(0 if remainder < 2 else 11 - remainder)


def generate(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=A4, invariant=True)
    c.setTitle("DANFE ficticio - razao social no cabecalho")
    c.setAuthor("Renomeador de PDFs - exemplos ficticios")
    c.setStrokeColor(HexColor("#b3bdb8"))
    c.setFillColor(HexColor("#17372b"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(32, 804, "EXEMPLO FICTICIO - SEM VALOR FISCAL")
    c.rect(28, 646, 539, 138)
    c.line(350, 646, 350, 784)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(40, 756, "COMERCIO DEMONSTRACAO LTDA")
    c.setFont("Helvetica", 10)
    c.drawString(40, 735, "Rua de Exemplo, 100 - Centro")
    c.drawString(40, 718, "Salvador - BA - CEP 00000-000")
    c.drawString(40, 701, "Fone: (00) 0000-0000")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(366, 756, "DANFE")
    c.setFont("Helvetica", 8)
    c.drawString(366, 735, "Documento Auxiliar da Nota Fiscal")
    c.drawString(366, 721, "Eletronica")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(366, 699, "Numero da NF: 000013913")
    c.setFont("Helvetica", 9)
    c.drawString(40, 673, "CNPJ: 00.000.000/0000-00")
    c.drawString(366, 673, "Data de Emissao: 05/10/2026")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(40, 623, "CHAVE DE ACESSO")
    c.setFont("Helvetica", 10)
    c.drawString(40, 605, access_key())
    c.line(28, 580, 567, 580)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, 559, "DESTINATARIO / REMETENTE")
    c.setFont("Helvetica", 8)
    c.drawString(40, 538, "NOME / RAZAO SOCIAL")
    c.drawString(386, 538, "CNPJ / CPF")
    c.setFont("Helvetica", 11)
    c.drawString(40, 518, "CLIENTE FICTICIO LTDA")
    c.drawString(386, 518, "11.111.111/1111-11")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, 478, "DADOS DOS PRODUTOS / SERVICOS")
    c.setFont("Helvetica", 10)
    c.drawString(40, 457, "ITEM FICTICIO PARA TESTE - 1 unidade")
    c.drawString(40, 426, "Valor total: R$ 37.750,00")
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#61756a"))
    c.drawString(32, 50, "Todos os nomes e identificadores deste documento sao ficticios.")
    c.save()


if __name__ == "__main__":
    generate(ROOT / "examples/07-danfe-cabecalho.pdf")
    print("DANFE ficticio gerado com emitente sem rotulo e destinatario separado.")
