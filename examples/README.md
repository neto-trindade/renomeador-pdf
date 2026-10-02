# PDFs fictícios

Todos os nomes, números e dados são inventados. Estes documentos **não têm valor fiscal**.

| Arquivo                  | O que demonstra                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `01-nota-ficticia.pdf`   | NF, empresa, emissão e CNPJ extraídos automaticamente                                                         |
| `02-nome-repetido.pdf`   | Mesmo nome, com sufixo automático ` (2)`                                                                      |
| `03-dados-ambiguos.pdf`  | Dois números distintos, sinalizados para revisão                                                              |
| `04-apenas-imagem.pdf`   | PDF digitalizado, com OCR automático para encontrar NF, empresa e data                                        |
| `05-cte-em-colunas.pdf`  | Número e data sob rótulos em colunas; emitente separado do cliente; NF referenciada separada do CTe principal |
| `06-fatura-ficticia.pdf` | Fatura, fornecedor, cliente, emissão, vencimento, valor e campo dinâmico “Centro de custo”                    |

O botão **Experimentar com 6 exemplos fictícios** usa exatamente esses PDFs, incluídos em `samples.js` em base64. Nenhum documento pessoal é necessário. O OCR pode precisar de internet para carregar seus recursos.

Para regenerar exemplos e fixtures, instale ReportLab e Pillow no ambiente Python e execute `python scripts/generate_samples.py`. O script sobrescreve apenas os exemplos e fixtures fictícios deste projeto; a imagem intermediária `.test-scan.png` não é publicada.
