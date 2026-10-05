# Validação da versão 2

Verificação inicial em 2 de outubro de 2026 (UTC); suíte reexecutada e extração da razão social ampliada em 5 de outubro de 2026. Documentos de teste inteiramente fictícios.

## Testes automatizados

Comando: `npm test`, Node.js 24. Projeto requer Node.js 20+ e não precisa de instalação de dependências para esses testes.

**40 testes aprovados, sem falhas**, na execução de 5 de outubro de 2026.

| Grupo | Evidência |
| --- | --- |
| Extração em PDFs reais | Texto nativo, todas as páginas, rótulos e valores em colunas |
| Contexto documental | CTe principal separado da NF citada; DANFE separado de referência a CTe |
| Papéis das empresas | Emitente e destinatário, CNPJs separados e empresa sob o cabeçalho do emitente |
| Tipos e campos | Abreviações de número com pontuação, NF, CTe, fatura, pedido, CE, emissão, vencimento, valor, cidade/UF e campo novo “Centro de custo” |
| Dados ausentes/conflitantes | Pendência sem adivinhar; correção ou uso explícito dos encontrados |
| Chaves e datas | Estrutura e dígito da chave; conflito com número impresso; data impossível descartada; dia de emissão não inferido da chave |
| Modelos | Cinco composições, textos em qualquer ordem, campos dinâmicos, validação e compatibilidade com modelos anteriores |
| Exceções | PDF inválido, senha, ignorar e reincluir, ausência de texto nativo |
| Adaptador OCR | Acionamento em páginas sem texto, continuação das páginas nativas e encerramento de falhas de carregamento sem repetir o erro por todo o lote |
| Exportação | ZIP/CSV, duplicidade, caracteres de nomes, fórmulas de CSV e bytes idênticos aos originais |
| Lote de 100 PDFs | Cem arquivos presentes no ZIP, nomes distintos e conteúdo de cada arquivo idêntico à origem |

O teste do adaptador de OCR usa um reconhecedor controlado para verificar o fluxo de páginas. A capacidade do motor real é verificada separadamente, sem substituir esse teste por uma resposta simulada.

## Correção da razão social — 5 de outubro de 2026

A ausência do nome foi reproduzida em um DANFE fictício com razão social no cabeçalho, sem o rótulo “Razão social”, e destinatário em outra seção. Após a correção, o PDF `07-danfe-cabecalho.pdf` gera `13913 - COMERCIO DEMONSTRACAO LTDA.pdf`; o cliente é identificado separadamente como `CLIENTE FICTICIO LTDA`.

Há testes adicionais para nome no recibo “Recebemos de ... os produtos”, razão social explicitamente rotulada, dois nomes conflitantes e cabeçalhos sem evidência suficiente. Endereço e destinatário não preenchem o nome do emitente. Dois candidatos distintos continuam pendentes.

A correção usa evidências do conteúdo, sem consulta externa de CNPJ. O relato veio por captura de tela, sem PDF original: a reprodução fictícia verifica a falha de cabeçalho, mas não comprova o resultado daquele layout específico.

## OCR real

Motor real Tesseract.js 7.0.0 com idioma português fixado em `@tesseract.js-data/por@1.0.0`, sobre a imagem fictícia de `04-apenas-imagem.pdf`: número **70001**, empresa **EMPRESA DEMO LTDA** e data **01-10-2026** reconhecidos automaticamente. O motor informou confiança global de 94 nessa imagem; isso não representa uma garantia de acerto de cada campo.

Na página pública, o mesmo PDF sem camada de texto ficou pronto como `70001 - EMPRESA DEMO LTDA.pdf`, com indicador **OCR**, sem abrir revisão nem preencher seus campos.

## Interface e download

Verificação inicial em 2 de outubro, no Chrome da página publicada em GitHub Pages:

- Seis exemplos enviados: cinco prontos automaticamente, um pendente por dois números conflitantes.
- CTe em colunas renomeado com número **346386**, mantendo **12345** como NF referenciada.
- Modelo com texto fixo `DOC ` movido para o início; inclusão de emissão no nome e prévia atualizada.
- Modelo salvo, página recarregada e modelo mantido; lote anterior removido da memória no recarregamento.
- Upload real pela seleção de arquivo, usando o PDF fictício em colunas, além do botão de demonstração.
- Opção “Usar campos encontrados” gerou um nome apenas com os valores disponíveis, sem escolher um dos números ambíguos.
- “Ignorar arquivo” excluiu a exceção da quantidade a exportar.
- ZIP preparado com cinco PDFs prontos e relatório; link persistente **Baixar arquivos** exibido.
- Um único documento gerou link **Baixar PDF** com o nome correto; mudar o padrão invalidou o download anterior.

**Limitação do ambiente:** a automação deste navegador não conseguiu capturar o arquivo baixado após clicar no link, também na tentativa pelo leitor de downloads. Portanto, a conclusão do download no navegador não foi verificada. A geração e a integridade dos arquivos ZIP/CSV foram verificadas no módulo real de exportação pela suíte automatizada. Não foi utilizada uma saída simulada para afirmar que houve download.

A captura da interface no README mostra a página real, com os resultados da análise.

## Limites da verificação

Documentos de demonstração, sem validação de todos os layouts fiscais. O lote de 100 usa PDFs pequenos com texto, sem medição de desempenho de 100 documentos digitalizados. Os testes não validam cadastro fiscal de empresas. O OCR depende da legibilidade, da capacidade do dispositivo e do carregamento dos recursos do motor.
