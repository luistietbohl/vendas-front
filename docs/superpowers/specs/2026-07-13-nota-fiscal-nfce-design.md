# Emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica)

## Contexto

Hoje a "nota" gerada pelo sistema é apenas um recibo impresso via `window.print()`
(`add-venda.tsx`, botão "Imprimir", linha 671) — não é um documento fiscal válido perante
a SEFAZ. Este spec cobre a emissão de uma **NFC-e real**, autorizada pela SEFAZ, para as
vendas da sorveteria (Sistema Bomcream), emitente CNPJ 35.242.747/0001-30, regime **MEI**.

Uma NFC-e só existe depois de ser transmitida e autorizada pela SEFAZ do estado do
emitente — não é geração local de PDF. A emissão real depende de pré-requisitos que
**não são código** (seção "Pré-requisitos fora do código" abaixo) e devem ser resolvidos
pelo dono do sistema antes de operar em produção.

## Pré-requisitos fora do código (responsabilidade do usuário, não deste projeto)

1. **Certificado digital e-CNPJ (A1 ou A3)**, emitido por uma Autoridade Certificadora.
2. **Confirmar com um contador** se, como MEI, é necessária Inscrição Estadual para emitir
   NFC-e no estado do emitente — a regra varia por estado e por faturamento.
3. **Conta em um provedor de emissão** — este design usa **Focus NFe** como referência
   (doc madura, ambiente de homologação gratuito, sem taxa de setup/fidelidade). O acesso
   é via API REST; o certificado digital é enviado ao provedor, que assina e transmite a
   nota à SEFAZ.
4. Confirmar valores exatos de plano/preço direto em focusnfe.com.br/precos antes de
   contratar (não fixados aqui pois mudam com frequência).

Enquanto esses itens não estiverem prontos, o backend deve operar contra o **ambiente de
homologação** do Focus NFe (`focusnfe.ambiente=homologacao`), que não gera notas fiscais
válidas mas permite testar toda a integração de ponta a ponta.

## Escopo

Adiciona:
- Classificação fiscal em produtos (com padrão global + override opcional).
- CPF opcional do cliente na venda.
- Integração backend com a API do Focus NFe para emitir NFC-e.
- Botão "Gerar Nota Fiscal" na tela de nova venda e na listagem de vendas.

Fora de escopo (YAGNI por agora, mas possível de adicionar depois sem redesenho):
cancelamento de NFC-e, carta de correção, contingência offline, emissão em lote,
tradução das mensagens de rejeição da SEFAZ.

## 1. Modelo de dados

### `ProdutoEntity` (`vendas/.../repository/entity/ProdutoEntity.java`)
Novos campos, todos opcionais — quando nulos, o `NfceService` usa o padrão global de
`application.properties`:
```java
private String ncm;              // default: focusnfe.fiscal.ncm.padrao
private String cfop;             // default: focusnfe.fiscal.cfop.padrao
private String csosn;            // default: focusnfe.fiscal.csosn.padrao (102, típico MEI)
private String unidadeComercial; // default "UN"
```
Mesmos campos espelhados em `ProdutoDTO` e no formulário de `add-produto.tsx`/`edit-produto.tsx`
como campos avançados/opcionais (não obrigatórios no formulário).

### `VendaEntity` (`vendas/.../repository/entity/VendaEntity.java`)
```java
// capturado na hora da venda
private String cpfCliente;          // opcional; se ausente, nota sai como consumidor não identificado

// preenchidos pelo backend ao tentar emitir
private String nfceStatus;          // null | "processando" | "autorizada" | "rejeitada" | "erro"
private String nfceChaveAcesso;     // chave de 44 dígitos, quando autorizada
private String nfceDanfeUrl;        // link do DANFE (PDF) devolvido pelo Focus NFe
private String nfceMotivoErro;      // mensagem crua de rejeição/erro da SEFAZ
private LocalDateTime nfceEmitidaEm;
```
Mesmos campos espelhados em `VendaDTO` e `venda.type.ts`.

## 2. Backend (`vendas/`)

### Configuração (`application.properties`)
```properties
focusnfe.api.token=${FOCUSNFE_TOKEN}
focusnfe.ambiente=homologacao
focusnfe.cnpj.emitente=35242747000130
focusnfe.fiscal.ncm.padrao=21050010
focusnfe.fiscal.cfop.padrao=5102
focusnfe.fiscal.csosn.padrao=102
```
O token nunca é commitado com valor real — vem de variável de ambiente
(`FOCUSNFE_TOKEN`). `focusnfe.ambiente` só muda para `producao` quando certificado e
cadastro no provedor estiverem completos.

### `NfceService` (novo, `service/NfceService.java`)
Responsabilidade única: montar o payload da NFC-e a partir de uma `VendaEntity`
(aplicando fallback fiscal dos produtos) e chamar `POST /v2/nfce?ref={vendaUid}` na API
do Focus NFe. Trata a resposta:
- `autorizado` → grava `nfceStatus=autorizada`, `nfceChaveAcesso`, `nfceDanfeUrl`.
- `erro_autorizacao` / `rejeitado` → grava `nfceStatus=rejeitada`, `nfceMotivoErro` com a
  mensagem crua da SEFAZ (ex: "Rejeição: 539 - Duplicidade de NFC-e").
- falha de rede/timeout → `nfceStatus=erro`; permite nova tentativa.

Isolado de `VendaService` — este continua só orquestrando CRUD; `NfceService` cuida
exclusivamente da integração fiscal, podendo trocar de provedor sem tocar no resto.

### Endpoints novos em `VendaController`
- `POST /v1/vendas/{id}/nfce` — dispara emissão, síncrono (Focus NFe responde em
  segundos; volume de MEI não justifica fila assíncrona).
- `GET /v1/vendas/{id}/nfce` — consulta status atual sem reemitir.

## 3. Frontend (`vendas-front/vendas-front/`)

### `src/services/nfce.service.ts` (novo)
Wrapper fino no padrão dos demais `*.service.ts`: `emitir(vendaId)` →
`POST /vendas/{id}/nfce`; `consultarStatus(vendaId)` → `GET /vendas/{id}/nfce`.

### Tipos
`venda.type.ts` ganha `cpfCliente`, `nfceStatus`, `nfceChaveAcesso`, `nfceDanfeUrl`,
`nfceMotivoErro`.

### `add-venda.tsx`
- Campo CPF opcional ao lado do campo "Cliente" (linha ~656-661), com validação de
  formato.
- Botão "Gerar Nota Fiscal" ao lado de "Imprimir" (linha ~671), habilitado só após
  "Finalizar Compra" (venda salva com `uid`).
- Estados: `Gerar Nota Fiscal` → clique dispara `Emitindo...` (desabilitado) → sucesso
  vira `Ver Nota Fiscal` (abre `nfceDanfeUrl` em nova aba) → erro mostra
  `nfceMotivoErro` em um Alert do MUI e o botão volta como `Tentar Novamente`.

### `list-venda.tsx`
- Mesmo botão e mesmos estados no painel de detalhe da venda selecionada (ao lado de
  "Remover"/"Atualizar", linha ~315-326) — permite emitir ou reemitir retroativamente em
  vendas já salvas.
- Se `nfceStatus === "autorizada"`, mostra a chave de acesso e o link "Ver DANFE" no
  lugar do botão de emitir.

### Tratamento de erro
Mensagens de rejeição da SEFAZ são mostradas cruas (sem tradução automática) — podem ser
necessárias para diagnóstico junto ao contador ou suporte do provedor.

## Testes

- Backend: testes de unidade do `NfceService` mockando a chamada HTTP ao Focus NFe
  (casos: autorizado, rejeitado, erro de rede) e do fallback fiscal produto→padrão
  global.
- Frontend: testes dos três estados do botão (`add-venda`/`list-venda`) e da validação
  de formato do CPF opcional.
- Fluxo real de ponta a ponta só é validável quando o ambiente de homologação do Focus
  NFe estiver configurado com uma conta real (fora do escopo deste código).
