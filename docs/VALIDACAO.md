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

A verificação da versão publicada está sendo feita separadamente para confirmar carregamento, exemplos, correção e download. O resultado final dessa verificação será registrado aqui após a publicação.
