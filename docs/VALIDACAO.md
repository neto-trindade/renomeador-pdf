# Validação

## Testes automatizados

Comando: `npm test` (Node.js 24 nesta verificação; projeto compatível com Node.js 20+).

Resultado: **14 testes aprovados**, sem falhas, em 2 de outubro de 2026 (UTC).

| Cenário | Resultado verificado |
| --- | --- |
| PDF com texto | Número, empresa, data e CNPJ extraídos |
| PDF com duas páginas | Dados encontrados na segunda página |
| Números ambíguos | Pendência até correção manual |
| PDF somente com imagem | Pendência e correção manual, sem OCR |
| Campo ausente | Pendência e possibilidade de nome completo |
| Arquivo falso com extensão PDF | Rejeitado, inclusive após tentativa de nome manual |
| PDF protegido | Leitura recusada; nome manual permitido sem remover a senha |
| Nomes repetidos | Sufixos únicos, inclusive com diferença de caixa |
| Formato personalizado | Prefixo, data, número e separador aplicados |
| Nome incompatível com Windows | Caracteres proibidos removidos e nome reservado protegido |
| Número no nome original | Alternativa usada somente sem ambiguidade no texto |
| ZIP e CSV | Bytes originais idênticos, duplicados separados e pendências registradas |
| Fórmulas em CSV | Valores potencialmente executáveis tratados como texto |
| Modelos salvos | Formatos desconhecidos rejeitados |

Os PDFs de teste foram gerados com dados inventados. Não houve medição de ganho de produtividade nem validação de todos os layouts fiscais existentes.

## Verificação no navegador

Verificação em Chrome na página pública do GitHub Pages, em 2 de outubro de 2026 (UTC):

- Página carregada com interface, bibliotecas locais e botão de exemplos.
- Quatro exemplos processados: dois prontos, dois pendentes, sem sobrescrever o nome repetido.
- Número ambíguo corrigido para `10001` e documento somente com imagem preenchido como `70001 - EMPRESA DEMO LTDA.pdf`.
- Após revisão, resumo confirmado: quatro arquivos prontos e zero pendências.
- Comando de exportação acionado; interface confirmou a geração do ZIP sem erro da aplicação.
- Captura real da demonstração incluída no README.

A automação do navegador não conseguiu capturar o arquivo baixado neste ambiente. A integridade do ZIP e do CSV foi verificada pela suíte automatizada, usando o mesmo módulo de exportação da aplicação. Esta checagem não substitui a verificação do download em todos os navegadores.

Não foi feita uma verificação específica em dispositivos móveis ou na abertura por `file://` nesta rodada.
