# Dependências de terceiros

Os arquivos originais de licença foram preservados. Eles se aplicam às respectivas dependências.

| Biblioteca | Versão incluída | Licença | Arquivos |
| --- | --- | --- | --- |
| [PDF.js](https://github.com/mozilla/pdf.js) | 3.11.174 | Apache 2.0 | `vendor/pdf.min.js`, `vendor/pdf.worker.min.js`, [licença](vendor/LICENSE-pdfjs.txt) |
| [JSZip](https://github.com/Stuk/jszip) | 3.10.1 | MIT ou GPLv3 | `vendor/jszip.min.js`, [licenças](vendor/LICENSE-jszip.md) |

A aplicação usa as bibliotecas empacotadas localmente; não as carrega de um CDN. ReportLab e Pillow são usados somente pelo script opcional de geração dos exemplos e não são necessários para executar a interface.
