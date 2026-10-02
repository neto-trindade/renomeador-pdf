# Validação da versão 2

Verificação em 2 de outubro de 2026 (UTC), com documentos inteiramente fictícios.

## Testes automatizados

Comando: `npm test`, Node.js 24. Projeto requer Node.js 20+ e não precisa de instalação de dependências para esses testes.

**31 testes aprovados, sem falhas.**

| Grupo | Evidência |
| --- | --- |
| Extração em PDFs reais | Texto nativo, todas as páginas, rótulos e valores em colunas |
| Contexto documental | CTe principal separado da NF citada; DANFE separado de referência a CTe |
| Papéis das empresas | Emitente e destinatário, com CNPJs separados |
| Tipos e campos | NF, CTe, fatura, pedido, CE, emissão, vencimento, valor, cidade/UF e campo novo “Centro de custo” |
| Dados ausentes/conflitantes | Pendência sem adivinhar; correção ou uso explícito dos encontrados |
| Chaves e datas | Estrutura e dígito da chave; conflito com número impresso; data impossível descartada; dia de emissão não inferido da chave |
| Modelos | Cinco composições, textos em qualquer ordem, campos dinâmicos, validação e compatibilidade com modelos anteriores |
| Exceções | PDF inválido, senha, ignorar e reincluir, ausência de texto nativo |
| Adaptador OCR | Acionamento em páginas sem texto e continuação da leitura de páginas nativas |
| Exportação | ZIP/CSV, duplicidade, caracteres de nomes, fórmulas de CSV e bytes idênticos aos originais |
| Lote de 100 PDFs | Cem arquivos presentes no ZIP, nomes distintos e conteúdo de cada arquivo idêntico à origem |

O teste do adaptador de OCR usa um reconhecedor controlado para verificar o fluxo de páginas. A capacidade do motor real é verificada separadamente, sem substituir esse teste por uma resposta simulada.

## OCR real

Integração Tesseract.js 7.0.0 com idioma português fixado em `@tesseract.js-data/por@1.0.0`, sobre a imagem fictícia de `04-apenas-imagem.pdf`. Verificação adicional na página hospedada após a publicação.

## Interface e download

A verificação da versão hospedada é registrada após a publicação, usando o mesmo módulo de análise e exportação da aplicação.

## Limites da verificação

Documentos de demonstração, sem validação de todos os layouts fiscais. O lote de 100 usa PDFs pequenos com texto, sem medição de desempenho de 100 documentos digitalizados. Os testes não validam cadastro fiscal de empresas. O OCR depende da legibilidade, da capacidade do dispositivo e do carregamento dos recursos do motor.
