# Dependências de terceiros

As licenças e avisos dos arquivos empacotados foram preservados.

| Biblioteca / recurso | Versão | Licença | Uso |
| --- | --- | --- | --- |
| [PDF.js](https://github.com/mozilla/pdf.js) | 3.11.174 | Apache 2.0 | Cliente e worker em `vendor/`; [licença](vendor/LICENSE-pdfjs.txt) |
| [JSZip](https://github.com/Stuk/jszip) | 3.10.1 | MIT ou GPLv3 | Cliente em `vendor/`; [licenças](vendor/LICENSE-jszip.md) |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | 7.0.0 | Apache 2.0 | Cliente e worker em `vendor/`; [licença](vendor/LICENSE-tesseract.md), [avisos do cliente](vendor/NOTICE-tesseract-client.txt), [avisos do worker](vendor/NOTICE-tesseract-worker.txt) |
| [Tesseract.js Core](https://github.com/naptha/tesseract.js-core) | 7.0.0 | Apache 2.0 | WebAssembly carregado do jsDelivr quando o OCR é necessário; [licença](vendor/LICENSE-tesseract-core.txt) |
| [Idioma português do Tesseract](https://github.com/naptha/tesseract.js-data) | pacote `@tesseract.js-data/por` 1.0.0, modelo `4.0.0_best_int` | Dados do projeto Tesseract, Apache 2.0 | `por.traineddata.gz` carregado do jsDelivr |

O código fixa os caminhos de versão dos recursos do OCR. Não envia PDFs nem imagens ao CDN: as imagens são reconhecidas localmente pelo worker. O idioma pode ser armazenado no cache do motor; os documentos não são persistidos.

ReportLab e Pillow são usados apenas pelo script opcional de geração dos documentos fictícios e não são necessários para executar a interface.
