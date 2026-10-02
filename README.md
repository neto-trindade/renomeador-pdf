# Renomeador de PDFs

**Padronização de documentos em lote, com prévia, revisão manual e processamento no navegador.**

Projeto de **[Neto Trindade](https://github.com/neto-trindade)** voltado à automação de rotinas administrativas. Organiza PDFs recebidos com nomes pouco descritivos e permite conferir o resultado antes de baixar.

**[Abrir a demonstração](https://neto-trindade.github.io/renomeador-pdf/)** · [PDFs fictícios de exemplo](examples) · [Como foi validado](docs/VALIDACAO.md)

## O problema

Arquivos como `documento_01.pdf` e `anexo.pdf` dificultam a localização de notas e outros documentos. Renomear cada arquivo manualmente exige abrir o PDF, procurar os dados e repetir o processo.

A ferramenta lê o texto disponível, sugere um nome como **`59349 - EMPRESA DEMO LTDA.pdf`** e sinaliza dados ausentes ou ambíguos para revisão. Nenhum PDF original é alterado: o download contém cópias com os novos nomes.

## Experimente em um minuto

1. Abra a [demonstração](https://neto-trindade.github.io/renomeador-pdf/) e clique em **Experimentar com exemplos**.
2. Confira os quatro documentos fictícios: dois ficam prontos, um tem números ambíguos e um contém somente imagem.
3. Use **Corrigir** para preencher os dados pendentes ou informar um nome completo.
4. Baixe um ZIP com os PDFs prontos e o relatório `relatorio.csv`.

O botão de exemplos funciona também na cópia local, sem baixar PDFs de um servidor.

## Recursos implementados

- Leitura do texto de todas as páginas com PDF.js.
- Identificação por regras de número da nota, razão social, data de emissão e CNPJ.
- Formatos prontos e composição personalizada com até três campos, separador e prefixo.
- Prévia dos nomes e correção manual dos campos ou do nome completo.
- Modelos de nome salvos no próprio navegador.
- Sufixos para nomes repetidos, como ` (2)`, considerando diferenças de maiúsculas e minúsculas.
- Exportação de PDFs em ZIP e relatório CSV com arquivos prontos e pendentes.
- Rejeição de arquivos inválidos e tratamento de PDFs protegidos por senha.

## Executar no computador

Em **Code → Download ZIP**, baixe e extraia o repositório. Abra `index.html` no Chrome ou Edge. A aplicação não precisa de conta, servidor, instalação ou chave de API.

As bibliotecas estão incluídas em `vendor/`. Na cópia local, a ferramenta e os exemplos funcionam sem internet. Na versão hospedada, a conexão é necessária para carregar a página inicialmente.

## Limites da demonstração

**Não há OCR.** PDFs digitalizados como imagem precisam de preenchimento manual. A extração usa regras para rótulos comuns; layouts diferentes podem exigir correção. Revise os dados sugeridos antes de usar os arquivos.

CNPJ e datas são extraídos como texto, sem validação fiscal. Um PDF com senha pode receber um nome manual, mas sua senha e seu conteúdo permanecem preservados. Os arquivos pendentes constam no relatório e ficam fora do ZIP até serem corrigidos.

O lote é mantido na memória do navegador. Lotes muito grandes ou PDFs complexos podem consumir mais memória. Esta versão é uma demonstração funcional de portfólio; não foi homologada para operação fiscal ou grandes volumes.

## Privacidade e dependências

O código processa os PDFs no navegador, sem enviar documentos para uma API ou backend. Apenas preferências de nomes são armazenadas em `localStorage`. Não há análise de uso, OCR externo ou integração com IA nesta versão.

As versões incluídas são PDF.js **3.11.174** e JSZip **3.10.1**, preservadas da base original. A leitura desativa `isEvalSupported`, conforme a [orientação oficial do PDF.js para CVE-2024-4367](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq), e a página usa uma política de conteúdo sem avaliação dinâmica de scripts. Uma atualização do PDF.js para módulos modernos é uma evolução planejada e exige rever a execução local.

Veja as licenças das dependências em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Organização do código

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` e `style.css` | Interface responsiva em português |
| `app.js` | Interações, preferências e estado do lote |
| `core.js` | Extração dos campos, nomes, colisões e CSV |
| `pdf-reader.js` | Leitura local do texto dos PDFs |
| `archive.js` | Montagem do ZIP e do relatório |
| `samples.js` e `examples/` | Demonstração com dados fictícios |
| `tests/` | Testes com PDFs reais de exemplo e arquivos inválidos |
| `scripts/generate_samples.py` | Geração reproduzível dos exemplos |

## Testes

Com Node.js 20 ou superior:

```sh
npm test
```

Não é necessário executar `npm install`: os testes usam o runner nativo do Node e as bibliotecas incluídas no projeto. A suíte verifica extração em várias páginas, correção manual, ambiguidades, arquivos inválidos, PDFs com senha, colisões, CSV e preservação dos bytes no ZIP.

## Competências demonstradas

Automação de processos, manipulação de documentos, JavaScript, tratamento de exceções, processamento no navegador, interface para revisão humana e testes de integridade de arquivos.

O projeto foi preparado com apoio de IA no desenvolvimento e na documentação. Os exemplos são totalmente fictícios e não incluem dados de clientes ou da empresa.
