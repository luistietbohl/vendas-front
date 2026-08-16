# CPF do consumidor na NFC-e Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o operador informe o CPF (opcional) do cliente ao emitir uma NFC-e, para que ele apareça na nota.

**Architecture:** O CPF é capturado na hora de emitir a nota (não na hora da venda), num campo novo do `NotaFiscalPanel` (frontend). Ele viaja no corpo do `POST /v1/notas-fiscais/{vendaId}/emitir`, passa por `NotaFiscalService` até `FocusNFeEmissorService`, que o inclui no payload da Focus NFe (`cpf_destinatario`, mais `nome_destinatario` quando `venda.cliente` estiver preenchido). Quando não informado, o payload e o comportamento continuam idênticos aos de hoje.

**Tech Stack:** Spring Boot 2.5.2 / Java 11+ (rodando com JDK 20 localmente) / MongoDB / JUnit 5 + Mockito no backend. React 17 + TypeScript / MUI v5 / Jest + Testing Library no frontend.

## Global Constraints

- Backend: `JAVA_HOME` precisa apontar para `C:\Java\jdk-20` neste ambiente antes de rodar `mvnw.cmd`.
- Backend: rodar comandos Maven a partir de `vendas/`.
- Frontend: rodar comandos npm a partir de `vendas-front/vendas-front/`.
- CPF é sempre opcional — nenhuma mudança de comportamento quando não informado (spec, seção "Escopo").
- Sem suporte a CNPJ do destinatário nesta iteração (spec, seção "Escopo" — fora de escopo).
- Sem validação forte de CPF no backend — a Focus NFe já rejeita CPF inválido e o erro já aparece pelo mecanismo existente de `mensagemSefaz` (spec, seção "3. Erros").

---

### Task 1: Backend — repassar CPF opcional até a Focus NFe (payload)

**Files:**
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/EmissorFiscalService.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/FocusNFeEmissorService.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalService.java:27`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/fiscal/FocusNFeEmissorServiceTest.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalServiceTest.java:38`

**Interfaces:**
- Consumes: nada de tasks anteriores (é a base).
- Produces: `EmissorFiscalService.emitir(VendaEntity venda, String cpfDestinatario)` — assinatura nova, usada pela Task 2 (`NotaFiscalService`).

- [ ] **Step 1: Atualizar os testes existentes para a nova assinatura e adicionar os testes de CPF**

Em `FocusNFeEmissorServiceTest.java`, trocar as três chamadas `service.emitir(venda)` (nos testes `emitirEnviaOPayloadEInterpretaAAutorizacao`, `emitirRetornaErroQuandoFocusNFeRespondeComStatusNao2xx` e `emitirNaoChamaOGatewayQuandoProdutoNaoTemDadosFiscaisCompletos`) por `service.emitir(venda, null)`.

Adicionar estes três testes novos ao final da classe, antes do fechamento `}`:

```java
    @Test
    void emitirIncluiCpfENomeDoDestinatarioQuandoCpfInformado() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();

        FocusNFeEmissorService service = new FocusNFeEmissorService(
                restTemplate, "TOKEN123", "homologacao", "35242747000130");

        ProdutoEntity produto = ProdutoEntity.builder()
                .uid("p1").nome("Sorvete 500ml").valor(new BigDecimal("15.00"))
                .ncm("21050010").cfop("5102").csosn("102").unidadeComercial("UN")
                .build();

        ItemVendaEntity item = ItemVendaEntity.builder()
                .produto(produto).quantidade(BigDecimal.ONE).valorItem(new BigDecimal("15.00"))
                .build();

        VendaEntity venda = VendaEntity.builder()
                .uid("venda-1")
                .cliente("Maria Silva")
                .itens(List.of(item))
                .valorTotal(new BigDecimal("15.00"))
                .formaPagamento("Dinheiro")
                .create(LocalDateTime.of(2026, 7, 25, 10, 0))
                .build();

        server.expect(requestTo("https://homologacao.focusnfe.com.br/v2/nfce?ref=venda-1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.cpf_destinatario").value("12345678900"))
                .andExpect(jsonPath("$.nome_destinatario").value("Maria Silva"))
                .andRespond(withSuccess(
                        "{\"status\":\"autorizado\",\"numero\":\"12\",\"serie\":\"1\","
                                + "\"chave_nfe\":\"CHAVE123\",\"caminho_danfe\":\"https://focusnfe/danfe/1\"}",
                        MediaType.APPLICATION_JSON));

        ResultadoEmissaoFiscal resultado = service.emitir(venda, "12345678900");

        assertEquals(NotaFiscalStatus.AUTORIZADA, resultado.getStatus());
        server.verify();
    }

    @Test
    void emitirNaoIncluiCpfNemNomeQuandoCpfNaoInformado() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();

        FocusNFeEmissorService service = new FocusNFeEmissorService(
                restTemplate, "TOKEN123", "homologacao", "35242747000130");

        VendaEntity venda = vendaValida();

        server.expect(requestTo("https://homologacao.focusnfe.com.br/v2/nfce?ref=venda-1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.cpf_destinatario").doesNotExist())
                .andExpect(jsonPath("$.nome_destinatario").doesNotExist())
                .andRespond(withSuccess("{\"status\":\"autorizado\"}", MediaType.APPLICATION_JSON));

        service.emitir(venda, null);

        server.verify();
    }

    @Test
    void emitirIncluiCpfSemNomeQuandoClienteEmBranco() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();

        FocusNFeEmissorService service = new FocusNFeEmissorService(
                restTemplate, "TOKEN123", "homologacao", "35242747000130");

        VendaEntity venda = vendaValida();

        server.expect(requestTo("https://homologacao.focusnfe.com.br/v2/nfce?ref=venda-1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.cpf_destinatario").value("12345678900"))
                .andExpect(jsonPath("$.nome_destinatario").doesNotExist())
                .andRespond(withSuccess("{\"status\":\"autorizado\"}", MediaType.APPLICATION_JSON));

        service.emitir(venda, "12345678900");

        server.verify();
    }
```

Em `NotaFiscalServiceTest.java`, no teste `emitirCriaUmaNotaQuandoNaoExisteRegistroAnterior`, trocar:
```java
when(emissorFiscalService.emitir(venda)).thenReturn(
```
por:
```java
when(emissorFiscalService.emitir(venda, null)).thenReturn(
```

- [ ] **Step 2: Rodar os testes e confirmar que falham (erro de compilação — a assinatura nova ainda não existe)**

Run: `cd vendas && JAVA_HOME="C:\Java\jdk-20" ./mvnw.cmd test -Dtest=FocusNFeEmissorServiceTest,NotaFiscalServiceTest`
Expected: FAIL — erro de compilação, `emitir(VendaEntity, String)` não existe em `EmissorFiscalService`/`FocusNFeEmissorService`.

- [ ] **Step 3: Implementar a assinatura nova**

Em `EmissorFiscalService.java`, trocar a linha 6:
```java
    ResultadoEmissaoFiscal emitir(VendaEntity venda);
```
por:
```java
    ResultadoEmissaoFiscal emitir(VendaEntity venda, String cpfDestinatario);
```

Em `FocusNFeEmissorService.java`, trocar o método `emitir` (linhas 48-65):
```java
    @Override
    public ResultadoEmissaoFiscal emitir(VendaEntity venda) {
        ResultadoEmissaoFiscal erroValidacao = validarDadosFiscais(venda);
        if (erroValidacao != null) {
            return erroValidacao;
        }

        String url = baseUrl() + "/v2/nfce?ref=" + venda.getUid();
        try {
            log.info("Emitindo NFC-e na Focus NFe: ref={} url={}", venda.getUid(), url);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(montarPayload(venda), headers());
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            logarResposta(venda.getUid(), response.getBody());
            return interpretarResposta(response.getBody());
        } catch (RestClientResponseException e) {
            return resultadoDeErroHttp(e);
        }
    }
```
por:
```java
    @Override
    public ResultadoEmissaoFiscal emitir(VendaEntity venda, String cpfDestinatario) {
        ResultadoEmissaoFiscal erroValidacao = validarDadosFiscais(venda);
        if (erroValidacao != null) {
            return erroValidacao;
        }

        String url = baseUrl() + "/v2/nfce?ref=" + venda.getUid();
        try {
            log.info("Emitindo NFC-e na Focus NFe: ref={} url={}", venda.getUid(), url);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(montarPayload(venda, cpfDestinatario), headers());
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            logarResposta(venda.getUid(), response.getBody());
            return interpretarResposta(response.getBody());
        } catch (RestClientResponseException e) {
            return resultadoDeErroHttp(e);
        }
    }
```

E trocar o método `montarPayload` (linhas 150-162):
```java
    Map<String, Object> montarPayload(VendaEntity venda) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cnpj_emitente", cnpjEmitente);
        payload.put("data_emissao", venda.getCreate()
                .atZone(ZoneId.of("America/Sao_Paulo"))
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        payload.put("presenca_comprador", "1");
        payload.put("modalidade_frete", "9");
        payload.put("local_destino", "1");
        payload.put("items", montarItens(venda));
        payload.put("formas_pagamento", montarFormasPagamento(venda));
        return payload;
    }
```
por:
```java
    Map<String, Object> montarPayload(VendaEntity venda, String cpfDestinatario) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cnpj_emitente", cnpjEmitente);
        payload.put("data_emissao", venda.getCreate()
                .atZone(ZoneId.of("America/Sao_Paulo"))
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        payload.put("presenca_comprador", "1");
        payload.put("modalidade_frete", "9");
        payload.put("local_destino", "1");
        if (!isBlank(cpfDestinatario)) {
            payload.put("cpf_destinatario", cpfDestinatario);
            if (!isBlank(venda.getCliente())) {
                payload.put("nome_destinatario", venda.getCliente());
            }
        }
        payload.put("items", montarItens(venda));
        payload.put("formas_pagamento", montarFormasPagamento(venda));
        return payload;
    }
```

Em `NotaFiscalService.java:27`, trocar:
```java
        ResultadoEmissaoFiscal resultado = emissorFiscalService.emitir(venda);
```
por:
```java
        ResultadoEmissaoFiscal resultado = emissorFiscalService.emitir(venda, null);
```
(Este `null` é temporário — a Task 2 troca por um parâmetro de verdade.)

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd vendas && JAVA_HOME="C:\Java\jdk-20" ./mvnw.cmd test -Dtest=FocusNFeEmissorServiceTest,NotaFiscalServiceTest`
Expected: PASS — todos os testes, incluindo os 3 novos.

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/fiscal/EmissorFiscalService.java src/main/java/com/sorveteria/bomcream/vendas/fiscal/FocusNFeEmissorService.java src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalService.java src/test/java/com/sorveteria/bomcream/vendas/fiscal/FocusNFeEmissorServiceTest.java src/test/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalServiceTest.java
git commit -m "Thread optional cpfDestinatario through to the Focus NFe payload"
```

---

### Task 2: Backend — expor o CPF pela API e gravar na nota

**Files:**
- Create: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/EmitirNotaFiscalDTO.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalEntity.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalService.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalController.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalServiceTest.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalControllerTest.java`

**Interfaces:**
- Consumes: `EmissorFiscalService.emitir(VendaEntity venda, String cpfDestinatario)` (Task 1).
- Produces: `NotaFiscalService.emitir(String vendaId, String cpfDestinatario)` e `POST /v1/notas-fiscais/{vendaId}/emitir` aceitando corpo opcional `{ "cpfDestinatario": "..." }` — usados pela Task 4 (frontend).

- [ ] **Step 1: Criar o DTO novo**

Criar `vendas/src/main/java/com/sorveteria/bomcream/vendas/fiscal/EmitirNotaFiscalDTO.java`:
```java
package com.sorveteria.bomcream.vendas.fiscal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmitirNotaFiscalDTO {
    private String cpfDestinatario;
}
```

- [ ] **Step 2: Atualizar os testes existentes para a nova assinatura e adicionar os testes de CPF**

Em `NotaFiscalServiceTest.java`, no teste `emitirCriaUmaNotaQuandoNaoExisteRegistroAnterior`, trocar:
```java
        when(emissorFiscalService.emitir(venda, null)).thenReturn(
```
(mantém — já está certo da Task 1) e trocar a chamada:
```java
        NotaFiscalEntity resultado = service.emitir("venda-1");
```
por:
```java
        NotaFiscalEntity resultado = service.emitir("venda-1", null);
```

Adicionar este teste novo ao final da classe, antes do fechamento `}`:
```java
    @Test
    void emitirGravaOCpfDestinatarioNaNota() {
        NotaFiscalService service = new NotaFiscalService(notaFiscalRepository, emissorFiscalService, vendaRepository);

        VendaEntity venda = VendaEntity.builder().uid("venda-1").build();
        when(vendaRepository.findById("venda-1")).thenReturn(Optional.of(venda));
        when(notaFiscalRepository.findByVendaUid("venda-1")).thenReturn(Optional.empty());
        when(emissorFiscalService.emitir(venda, "12345678900")).thenReturn(
                ResultadoEmissaoFiscal.builder().status(NotaFiscalStatus.AUTORIZADA).build());
        when(notaFiscalRepository.save(any(NotaFiscalEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NotaFiscalEntity resultado = service.emitir("venda-1", "12345678900");

        assertEquals("12345678900", resultado.getCpfDestinatario());
    }
```

Em `NotaFiscalControllerTest.java`, no teste `emitirRetornaANotaAutorizada`, trocar:
```java
        when(service.emitir("venda-1")).thenReturn(nota);
```
por:
```java
        when(service.emitir("venda-1", null)).thenReturn(nota);
```

Adicionar este teste novo ao final da classe, antes do fechamento `}`:
```java
    @Test
    void emitirEnviaOCpfDoCorpoAoServico() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new NotaFiscalController(service)).build();

        NotaFiscalEntity nota = NotaFiscalEntity.builder()
                .uid("nota-1").vendaUid("venda-1").status(NotaFiscalStatus.AUTORIZADA)
                .cpfDestinatario("12345678900").build();
        when(service.emitir("venda-1", "12345678900")).thenReturn(nota);

        String body = new ObjectMapper().writeValueAsString(
                EmitirNotaFiscalDTO.builder().cpfDestinatario("12345678900").build());

        mockMvc.perform(post("/v1/notas-fiscais/venda-1/emitir")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cpfDestinatario").value("12345678900"));
    }
```

- [ ] **Step 3: Rodar os testes e confirmar que falham (erro de compilação)**

Run: `cd vendas && JAVA_HOME="C:\Java\jdk-20" ./mvnw.cmd test -Dtest=NotaFiscalServiceTest,NotaFiscalControllerTest`
Expected: FAIL — erro de compilação, `emitir(String, String)` não existe em `NotaFiscalService`, `getCpfDestinatario()` não existe em `NotaFiscalEntity`/`EmitirNotaFiscalDTO` ainda não é aceito pelo controller.

- [ ] **Step 4: Implementar**

Em `NotaFiscalEntity.java`, adicionar o campo novo depois de `justificativaCancelamento` (linha 32):
```java
    private String justificativaCancelamento;
    private String cpfDestinatario;
```

Em `NotaFiscalService.java`, trocar o método `emitir` (linhas 17-31):
```java
    public NotaFiscalEntity emitir(String vendaId) {
        VendaEntity venda = vendaRepository.findById(vendaId)
                .orElseThrow(() -> new RuntimeException("Venda não encontrada"));

        NotaFiscalEntity nota = notaFiscalRepository.findByVendaUid(vendaId)
                .orElseGet(() -> NotaFiscalEntity.builder()
                        .vendaUid(vendaId)
                        .status(NotaFiscalStatus.NAO_EMITIDA)
                        .build());

        ResultadoEmissaoFiscal resultado = emissorFiscalService.emitir(venda, null);
        aplicarResultado(nota, resultado);
        nota.setDataEmissao(LocalDateTime.now());
        return notaFiscalRepository.save(nota);
    }
```
por:
```java
    public NotaFiscalEntity emitir(String vendaId, String cpfDestinatario) {
        VendaEntity venda = vendaRepository.findById(vendaId)
                .orElseThrow(() -> new RuntimeException("Venda não encontrada"));

        NotaFiscalEntity nota = notaFiscalRepository.findByVendaUid(vendaId)
                .orElseGet(() -> NotaFiscalEntity.builder()
                        .vendaUid(vendaId)
                        .status(NotaFiscalStatus.NAO_EMITIDA)
                        .build());

        ResultadoEmissaoFiscal resultado = emissorFiscalService.emitir(venda, cpfDestinatario);
        aplicarResultado(nota, resultado);
        nota.setCpfDestinatario(cpfDestinatario);
        nota.setDataEmissao(LocalDateTime.now());
        return notaFiscalRepository.save(nota);
    }
```

Em `NotaFiscalController.java`, trocar o método `emitir` (linhas 13-20):
```java
    @PostMapping("/{vendaId}/emitir")
    public ResponseEntity emitir(@PathVariable String vendaId) {
        try {
            return ResponseEntity.ok(service.emitir(vendaId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
```
por:
```java
    @PostMapping("/{vendaId}/emitir")
    public ResponseEntity emitir(@PathVariable String vendaId,
                                  @RequestBody(required = false) EmitirNotaFiscalDTO dto) {
        try {
            String cpfDestinatario = dto != null ? dto.getCpfDestinatario() : null;
            return ResponseEntity.ok(service.emitir(vendaId, cpfDestinatario));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `cd vendas && JAVA_HOME="C:\Java\jdk-20" ./mvnw.cmd test -Dtest=NotaFiscalServiceTest,NotaFiscalControllerTest,FocusNFeEmissorServiceTest`
Expected: PASS — todos os testes.

- [ ] **Step 6: Rodar a suíte completa do backend**

Run: `cd vendas && JAVA_HOME="C:\Java\jdk-20" ./mvnw.cmd test`
Expected: PASS — nenhum outro teste quebrou.

- [ ] **Step 7: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/fiscal/EmitirNotaFiscalDTO.java src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalEntity.java src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalService.java src/main/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalController.java src/test/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalServiceTest.java src/test/java/com/sorveteria/bomcream/vendas/fiscal/NotaFiscalControllerTest.java
git commit -m "Accept optional cpfDestinatario in POST /v1/notas-fiscais/{vendaId}/emitir"
```

---

### Task 3: Frontend — utilitário de validação/formatação de CPF

**Files:**
- Create: `vendas-front/vendas-front/src/utils/cpf.ts`
- Test: `vendas-front/vendas-front/src/utils/cpf.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `apenasDigitos(valor: string): string`, `formatarCpf(valor: string): string`, `cpfValido(valor: string): boolean` — usados pela Task 4.

- [ ] **Step 1: Escrever o teste (vai falhar pois `src/utils/cpf.ts` ainda não existe)**

Criar `vendas-front/vendas-front/src/utils/cpf.test.ts`:
```ts
import { apenasDigitos, cpfValido, formatarCpf } from './cpf';

describe('cpf utils', () => {
  it('aceita um CPF valido com pontuacao', () => {
    expect(cpfValido('111.444.777-35')).toBe(true);
  });

  it('aceita um CPF valido so com digitos', () => {
    expect(cpfValido('11144477735')).toBe(true);
  });

  it('rejeita um CPF com digito verificador errado', () => {
    expect(cpfValido('111.444.777-36')).toBe(false);
  });

  it('rejeita sequencias repetidas', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com tamanho errado', () => {
    expect(cpfValido('123.456.789')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(cpfValido('')).toBe(false);
  });

  it('formata digitos conforme digitado', () => {
    expect(formatarCpf('111')).toBe('111');
    expect(formatarCpf('111444777')).toBe('111.444.777');
    expect(formatarCpf('11144477735')).toBe('111.444.777-35');
  });

  it('extrai somente digitos', () => {
    expect(apenasDigitos('111.444.777-35')).toBe('11144477735');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd vendas-front/vendas-front && CI=true npm test -- src/utils/cpf.test.ts --watchAll=false`
Expected: FAIL — `Cannot find module './cpf'`.

- [ ] **Step 3: Implementar**

Criar `vendas-front/vendas-front/src/utils/cpf.ts`:
```ts
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarCpf(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function cpfValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  if (digitos.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(digitos.slice(0, 9), 10);
  if (digito1 !== parseInt(digitos[9], 10)) {
    return false;
  }
  const digito2 = calcularDigito(digitos.slice(0, 10), 11);
  return digito2 === parseInt(digitos[10], 10);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd vendas-front/vendas-front && CI=true npm test -- src/utils/cpf.test.ts --watchAll=false`
Expected: PASS — todos os 8 casos.

- [ ] **Step 5: Commit**

```bash
cd vendas-front/vendas-front
git add src/utils/cpf.ts src/utils/cpf.test.ts
git commit -m "Add CPF format/validation utility"
```

---

### Task 4: Frontend — campo de CPF no painel de nota fiscal

**Files:**
- Modify: `vendas-front/vendas-front/src/services/nota-fiscal.service.ts`
- Modify: `vendas-front/vendas-front/src/components/venda/nota-fiscal-panel.tsx`
- Test: `vendas-front/vendas-front/src/components/venda/nota-fiscal-panel.test.tsx`

**Interfaces:**
- Consumes: `apenasDigitos`, `cpfValido`, `formatarCpf` (Task 3); `POST /v1/notas-fiscais/{vendaId}/emitir` com corpo `{ cpfDestinatario }` (Task 2).
- Produces: nada consumido por outras tasks — é a ponta final da funcionalidade.

- [ ] **Step 1: Atualizar os testes existentes e adicionar os testes de CPF**

Em `nota-fiscal-panel.test.tsx`, no teste `'emits the note and shows the DANFE link once authorized'`, trocar:
```ts
    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1');
```
por:
```ts
    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1', undefined);
```

No teste `'ignores a stale emitir response for a venda that is no longer displayed'`, trocar:
```ts
    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1');
```
por:
```ts
    expect(mockedService.emitir).toHaveBeenCalledWith('venda-1', undefined);
```

Adicionar estes três testes novos, antes do fechamento `});` final da `describe`:
```ts
  it('shows an invalid CPF message and disables the emitir button', () => {
    render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.111.111-11' },
    });

    expect(screen.getByText('CPF inválido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir Nota Fiscal' })).toBeDisabled();
  });

  it('sends only the CPF digits to the service when a valid CPF is entered', async () => {
    mockedService.emitir.mockResolvedValue({
      data: { vendaUid: 'venda-1', status: 'AUTORIZADA', urlDanfe: 'https://focusnfe/danfe/1' },
    } as any);

    render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.444.777-35' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Emitir Nota Fiscal' }));

    await waitFor(() => {
      expect(mockedService.emitir).toHaveBeenCalledWith('venda-1', '11144477735');
    });
  });

  it('clears the CPF field when the venda changes', () => {
    const { rerender } = render(<NotaFiscalPanel vendaUid="venda-1" />);

    fireEvent.change(screen.getByLabelText('CPF do cliente (opcional)'), {
      target: { value: '111.444.777-35' },
    });
    expect(screen.getByLabelText('CPF do cliente (opcional)')).toHaveValue('111.444.777-35');

    rerender(<NotaFiscalPanel vendaUid="venda-2" />);

    expect(screen.getByLabelText('CPF do cliente (opcional)')).toHaveValue('');
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd vendas-front/vendas-front && CI=true npm test -- src/components/venda/nota-fiscal-panel.test.tsx --watchAll=false`
Expected: FAIL — `toHaveBeenCalledWith('venda-1', undefined)` não bate (hoje é chamado só com `'venda-1'`), e `getByLabelText('CPF do cliente (opcional)')` não encontra nenhum elemento.

- [ ] **Step 3: Implementar**

Em `nota-fiscal.service.ts`, trocar:
```ts
  emitir(vendaId: string) {
    return http.post<NotaFiscalDTO>(`/notas-fiscais/${vendaId}/emitir`);
  }
```
por:
```ts
  emitir(vendaId: string, cpfDestinatario?: string) {
    return http.post<NotaFiscalDTO>(`/notas-fiscais/${vendaId}/emitir`, {
      cpfDestinatario: cpfDestinatario ?? null,
    });
  }
```

Em `nota-fiscal-panel.tsx`, atualizar o import do topo, trocando:
```tsx
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, TextField } from "@mui/material";
import NotaFiscalDTO from "../../types/nota-fiscal.type";
import NotaFiscalService from "../../services/nota-fiscal.service";
```
por:
```tsx
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, TextField } from "@mui/material";
import NotaFiscalDTO from "../../types/nota-fiscal.type";
import NotaFiscalService from "../../services/nota-fiscal.service";
import { apenasDigitos, cpfValido, formatarCpf } from "../../utils/cpf";
```

Adicionar o estado novo logo depois de `mostrarCancelamento`, trocando:
```tsx
  const [mostrarCancelamento, setMostrarCancelamento] = useState(false);
  const vendaUidRef = useRef(vendaUid);
```
por:
```tsx
  const [mostrarCancelamento, setMostrarCancelamento] = useState(false);
  const [cpfCliente, setCpfCliente] = useState("");
  const vendaUidRef = useRef(vendaUid);
  const cpfDigitos = apenasDigitos(cpfCliente);
  const cpfInvalido = cpfDigitos.length > 0 && !cpfValido(cpfCliente);

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpfCliente(formatarCpf(e.target.value));
  }
```

No `useEffect` de reset por troca de `vendaUid`, trocar:
```tsx
  useEffect(() => {
    vendaUidRef.current = vendaUid;
    setNota(null);
    setErro(null);
    setMostrarCancelamento(false);
    setJustificativa("");
```
por:
```tsx
  useEffect(() => {
    vendaUidRef.current = vendaUid;
    setNota(null);
    setErro(null);
    setMostrarCancelamento(false);
    setJustificativa("");
    setCpfCliente("");
```

No método `emitir`, trocar:
```tsx
  function emitir() {
    if (!vendaUid) {
      return;
    }
    const requestedVendaUid = vendaUid;
    setCarregando(true);
    setErro(null);
    NotaFiscalService.emitir(vendaUid)
```
por:
```tsx
  function emitir() {
    if (!vendaUid || cpfInvalido) {
      return;
    }
    const requestedVendaUid = vendaUid;
    setCarregando(true);
    setErro(null);
    NotaFiscalService.emitir(vendaUid, cpfDigitos || undefined)
```

No JSX, trocar o bloco do botão "Emitir Nota Fiscal":
```tsx
      {(!nota || nota.status === "NAO_EMITIDA" || nota.status === "REJEITADA" || nota.status === "ERRO") && (
        <Button
          variant="contained"
          color="primary"
          disabled={!vendaUid || carregando}
          onClick={emitir}
        >
          Emitir Nota Fiscal
        </Button>
      )}
```
por:
```tsx
      {(!nota || nota.status === "NAO_EMITIDA" || nota.status === "REJEITADA" || nota.status === "ERRO") && (
        <>
          <TextField
            label="CPF do cliente (opcional)"
            value={cpfCliente}
            onChange={handleCpfChange}
            error={cpfInvalido}
            helperText={cpfInvalido ? "CPF inválido" : " "}
            inputProps={{ maxLength: 14 }}
          />
          <Button
            variant="contained"
            color="primary"
            disabled={!vendaUid || carregando || cpfInvalido}
            onClick={emitir}
          >
            Emitir Nota Fiscal
          </Button>
        </>
      )}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd vendas-front/vendas-front && CI=true npm test -- src/components/venda/nota-fiscal-panel.test.tsx --watchAll=false`
Expected: PASS — todos os testes, incluindo os 3 novos.

- [ ] **Step 5: Checar os tipos**

Run: `cd vendas-front/vendas-front && npx tsc --noEmit -p .`
Expected: sem erros novos.

- [ ] **Step 6: Rodar a suíte completa do frontend**

Run: `cd vendas-front/vendas-front && CI=true npm test -- --watchAll=false`
Expected: PASS — nenhum outro teste quebrou.

- [ ] **Step 7: Commit**

```bash
cd vendas-front/vendas-front
git add src/services/nota-fiscal.service.ts src/components/venda/nota-fiscal-panel.tsx src/components/venda/nota-fiscal-panel.test.tsx
git commit -m "Add optional CPF field to the nota fiscal emission panel"
```

---

## After all tasks are done

- [ ] Reconstruir e reiniciar backend e frontend com os scripts existentes (`vendas/atualizar-backend.bat`, `vendas-front/vendas-front/atualizar-sistema.bat`) e testar manualmente: emitir uma nota sem CPF (comportamento igual ao de hoje) e emitir uma nota com um CPF válido, conferindo que ele aparece na nota gerada pela Focus NFe.
