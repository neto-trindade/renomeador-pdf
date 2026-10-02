# PDFs fictícios

Todos os nomes, números e dados são inventados. Estes documentos **não têm valor fiscal**.

| Arquivo | O que demonstra |
| --- | --- |
| `01-nota-ficticia.pdf` | Extração automática e nome `59349 - EMPRESA DEMO LTDA.pdf` |
| `02-nome-repetido.pdf` | Mesmo nome sugerido, com sufixo automático ` (2)` |
| `03-dados-ambiguos.pdf` | Dois números distintos: revisão manual necessária |
| `04-apenas-imagem.pdf` | PDF sem texto selecionável: preencher os campos manualmente |

O botão **Experimentar com exemplos** usa exatamente esses quatro PDFs, incluídos em `samples.js` em base64 para funcionamento offline.

Para regenerar os exemplos e os PDFs de teste, instale ReportLab e Pillow no seu ambiente Python e execute `python scripts/generate_samples.py`. O programa sobrescreve somente os exemplos fictícios e fixtures deste repositório.
