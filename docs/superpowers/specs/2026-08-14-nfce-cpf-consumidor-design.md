# CPF do consumidor na NFC-e

## Contexto

A emissão de NFC-e (`docs/superpowers/specs/2026-07-13-nota-fiscal-nfce-design.md`) já está em
produção: o botão "Emitir Nota Fiscal" existe em `add-venda.tsx` e `list-venda.tsx`, via
`NotaFiscalPanel` (`vendas-front/vendas-front/src/components/venda/nota-fiscal-panel.tsx`), chamando
o backend (`vendas/.../fiscal/NotaFiscalController.java`) que fala com a Focus NFe.

Hoje o payload enviado à Focus NFe (`FocusNFeEmissorService.montarPayload`) não identifica o
cliente — toda nota sai como consumidor não identificado. Clientes às vezes pedem CPF na nota
(garantia, programas como Nota Fiscal Paulista). Não existe hoje nenhum campo de CPF de cliente
no sistema (só existe CPF de `Funcionario`, que é outra entidade, sem relação).

O design original (2026-07-13) previa capturar o CPF na hora da venda, como campo em
`VendaEntity`. A implementação real seguiu outro caminho (entidade `NotaFiscalEntity` separada,
não campos soltos em `VendaEntity`), e este spec adota a mesma decisão de captura tomada agora:
**CPF opcional na hora de emitir a nota**, não na hora de montar o carrinho — cobre tanto emissão
logo após finalizar a venda quanto emissão posterior pelo histórico, sem exigir perguntar o CPF
em toda venda.

## Escopo

Adiciona:
- Campo opcional de CPF no `NotaFiscalPanel`, visível junto do botão "Emitir Nota Fiscal".
- Validação de CPF (formato + dígito verificador) no frontend antes de habilitar o envio.
- Envio do CPF (e do nome já existente em `venda.cliente`, quando preenchido) para a Focus NFe.
- Registro do CPF usado em cada emissão, no `NotaFiscalEntity`, para auditoria.

Fora de escopo (YAGNI por agora): suporte a CNPJ do destinatário, edição/reenvio de CPF depois
de emitida, validação forte de CPF no backend (a Focus NFe já rejeita CPF inválido e o erro já
aparece pelo mecanismo existente de exibição de `mensagemSefaz`).

## 1. Frontend

### `nota-fiscal-panel.tsx`
- Novo estado local `cpfCliente: string` (dígitos formatados para exibição, ex.:
  `123.456.789-00`) e `cpfValido: boolean`.
- Campo de texto "CPF do cliente (opcional)" renderizado nas mesmas condições em que o botão
  "Emitir Nota Fiscal" já aparece hoje (`!nota || status NAO_EMITIDA/REJEITADA/ERRO`).
- Máscara aplicada no `onChange` (formata para `000.000.000-00` conforme digita).
- Validação client-side (função utilitária de CPF: 11 dígitos, não pode ser sequência repetida,
  dígitos verificadores corretos) roda a cada mudança:
  - Campo vazio → válido (CPF é opcional), sem mensagem.
  - Campo não vazio e inválido → mensagem "CPF inválido" abaixo do campo, botão "Emitir Nota
    Fiscal" desabilitado.
  - Campo não vazio e válido → botão habilitado normalmente.
- `emitir()` remove a máscara de `cpfCliente` (mantendo só os dígitos) e passa a chamar
  `NotaFiscalService.emitir(vendaId, cpfDigitos || undefined)`.

### `nota-fiscal.service.ts`
```ts
emitir(vendaId: string, cpfDestinatario?: string) {
  return http.post<NotaFiscalDTO>(`/notas-fiscais/${vendaId}/emitir`, { cpfDestinatario: cpfDestinatario ?? null });
}
```

## 2. Backend (`vendas/`)

### `EmitirNotaFiscalDTO` (novo, mesmo pacote de `CancelarNotaFiscalDTO`)
```java
private String cpfDestinatario; // opcional, 11 dígitos, sem pontuação
```

### `NotaFiscalController.emitir`
Passa a aceitar `@RequestBody(required = false) EmitirNotaFiscalDTO dto` e repassa
`dto != null ? dto.getCpfDestinatario() : null` para o service.

### `NotaFiscalService.emitir(String vendaId, String cpfDestinatario)`
Repassa `cpfDestinatario` para `emissorFiscalService.emitir(venda, cpfDestinatario)` e grava o
valor recebido no `NotaFiscalEntity` (novo campo `cpfDestinatario`), independentemente do
resultado da emissão — serve só como registro do que foi tentado.

### `EmissorFiscalService` / `FocusNFeEmissorService`
Assinatura muda para `emitir(VendaEntity venda, String cpfDestinatario)`. Em `montarPayload`:
- Se `cpfDestinatario` não for vazio: `payload.put("cpf_destinatario", cpfDestinatario)`.
- Se, além disso, `venda.getCliente()` não for vazio: `payload.put("nome_destinatario",
  venda.getCliente())`.
- Se `cpfDestinatario` for vazio/nulo: payload idêntico ao atual (nenhuma mudança de
  comportamento para notas sem CPF).

### `NotaFiscalEntity`
Novo campo `private String cpfDestinatario;` (opcional, só para registro/auditoria — não é
usado para nada além de exibição futura, se necessário).

## 3. Erros

Nenhum tratamento novo de erro no backend: CPF malformado que chegue até a Focus NFe (ex.: via
chamada direta à API, pulando a validação da tela) é rejeitado por ela e aparece pelo mecanismo
já existente — `resultadoDeErroHttp` grava `status=ERRO` com `mensagemSefaz`, exibido no
`NotaFiscalPanel` como já acontece hoje para qualquer erro de emissão.

## 4. Testes

- Utilitário de validação de CPF (frontend): casos válido, inválido (dígito verificador errado),
  sequência repetida (`111.111.111-11`), tamanho errado.
- `FocusNFeEmissorService.montarPayload`: com CPF e nome, com CPF sem nome (cliente vazio), sem
  CPF (payload igual ao atual).
