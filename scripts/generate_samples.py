"""Regenerate the fictional PDFs and the embedded offline demo. Requires reportlab and Pillow."""
from pathlib import Path
from io import BytesIO
import base64
import json
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = A4

def page(c, heading, lines):
    c.setFillColor(HexColor('#137b55'))
    c.rect(0, HEIGHT-90, WIDTH, 90, fill=1, stroke=0)
    c.setFillColor(HexColor('#ffffff'))
    c.setFont('Helvetica-Bold', 21)
    c.drawString(44, HEIGHT-44, heading)
    c.setFont('Helvetica', 11)
    c.drawString(44, HEIGHT-66, 'EXEMPLO FICTICIO - SEM VALOR FISCAL')
    c.setFillColor(HexColor('#263b2c'))
    y = HEIGHT-138
    for label, value in lines:
        c.setFont('Helvetica-Bold', 11)
        c.drawString(44, y, label)
        c.setFont('Helvetica', 14)
        c.drawString(44, y-22, value)
        y -= 74
    c.setStrokeColor(HexColor('#d5e1d7'))
    c.line(44, 70, WIDTH-44, 70)
    c.setFont('Helvetica', 9)
    c.setFillColor(HexColor('#687b6d'))
    c.drawString(44, 50, 'Dados inventados para demonstracao e testes. Nenhum documento real foi utilizado.')

def text_pdf(path, lines, pages=1, password=None):
    c = canvas.Canvas(str(path), pagesize=A4, invariant=True, encrypt=password)
    c.setTitle('Documento ficticio para demonstracao')
    c.setAuthor('Renomeador de PDFs - exemplos ficticios')
    for n in range(pages):
        page(c, 'Documento de demonstracao', lines if n == pages-1 else [('Pagina', 'Continuacao de exemplo sem dados de renomeacao')])
        c.showPage()
    c.save()

examples = ROOT/'examples'
fixtures = ROOT/'tests/fixtures'
examples.mkdir(exist_ok=True)
fixtures.mkdir(parents=True, exist_ok=True)
normal = [('Numero da NF: 00059349', 'Documento ficticio de teste'), ('Razao Social: EMPRESA DEMO LTDA', 'Empresa totalmente ficticia'), ('Data de Emissao: 01/10/2026', 'CNPJ: 00.000.000/0000-00')]
# Put the actual field values on their labelled line, as in common PDFs with selectable text.
normal = [('Numero da NF: 00059349', 'Exemplo para padronizacao de nomes'), ('Razao Social: EMPRESA DEMO LTDA', 'Nome inventado'), ('Data de Emissao: 01/10/2026', 'CNPJ: 00.000.000/0000-00')]
text_pdf(examples/'01-nota-ficticia.pdf', normal)
text_pdf(examples/'02-nome-repetido.pdf', normal)
text_pdf(examples/'03-dados-ambiguos.pdf', [('Numero da NF: 00010001', 'Primeiro numero encontrado'), ('Numero da NF: 00010002', 'Segundo numero: requer revisao manual'), ('Razao Social: EMPRESA DEMO LTDA', 'Exemplo com mais de um numero')])
image = Image.new('RGB', (1190, 1684), 'white')
d = ImageDraw.Draw(image)
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(fontpath, 32) if Path(fontpath).exists() else ImageFont.load_default(size=32)
d.rectangle((0,0,1190,180), fill='#137b55')
d.text((80,65), 'EXEMPLO FICTICIO - PDF SEM TEXTO', font=font, fill='white')
for i, line in enumerate(['Numero da NF: 00070001', 'Razao Social: EMPRESA DEMO LTDA', 'Data de Emissao: 01/10/2026', 'Documento digitalizado para leitura automatica.', 'SEM VALOR FISCAL']):
    d.text((80,280+i*100),line,font=font,fill='#263b2c')
c=canvas.Canvas(str(examples/'04-apenas-imagem.pdf'),pagesize=A4,invariant=True)
c.setTitle('Exemplo ficticio sem camada de texto')
c.drawImage(ImageReader(image),0,0,width=WIDTH,height=HEIGHT)
c.save()
image.save(ROOT/'.test-scan.png')

def table_pdf(path, heading, rows):
    c=canvas.Canvas(str(path),pagesize=A4,invariant=True)
    c.setTitle(heading+' - EXEMPLO FICTICIO')
    page(c,heading,[])
    y=HEIGHT-135
    for row in rows:
        for x,label,value in row:
            c.setFillColor(HexColor('#64746c')); c.setFont('Helvetica-Bold',9); c.drawString(x,y,label)
            c.setFillColor(HexColor('#20332b')); c.setFont('Helvetica',11); c.drawString(x,y-20,value)
        y-=70
    c.save()

table_pdf(examples/'05-cte-em-colunas.pdf','DACTE - Conhecimento de Transporte',[
    [(44,'Numero do CTe','000346386'),(315,'Data de Emissao','29/09/2026')],
    [(44,'Emitente','TRANSPORTADORA ALFA LTDA'),(315,'Destinatario','CLIENTE DEMO LTDA')],
    [(44,'CNPJ do Emitente','00.000.000/0000-00'),(315,'Valor total','R$ 5.320,00')],
    [(44,'Numero da NF','00012345'),(315,'Municipio','Salvador')],
    [(44,'UF','BA'),(315,'Codigo interno','LOG-2026')],
])
text_pdf(examples/'06-fatura-ficticia.pdf',[('Numero da Fatura: 00090001','FATURA FICTICIA - SEM VALOR FISCAL'),('Fornecedor: SERVICOS BETA LTDA','Cliente: CLIENTE DEMO LTDA'),('Data de Emissao: 01/10/2026','Data de Vencimento: 15/10/2026'),('Valor total: R$ 1.250,00','Centro de custo: FIN-02'),('Cidade: Salvador','UF: BA')])
text_pdf(fixtures/'sem-empresa.pdf', [('Numero da NF: 00081001','Empresa ausente de proposito')])
text_pdf(fixtures/'varias-paginas.pdf', normal, pages=2)
text_pdf(fixtures/'protegido.pdf', normal, password='senha-de-teste')
(fixtures/'invalido.pdf').write_text('Este arquivo nao e um PDF. Fixture ficticia para validacao.\n')
embedded=[{'name':f.name,'base64':base64.b64encode(f.read_bytes()).decode()} for f in sorted(examples.glob('*.pdf'))]
(ROOT/'samples.js').write_text('// Fictional sample PDFs embedded for an offline one-click demo.\nconst RenomeadorSamples = '+json.dumps(embedded,ensure_ascii=False,separators=(',',':'))+';\n')
print('9 PDFs ficticios, 1 arquivo invalido e 6 exemplos incorporados gerados.')
