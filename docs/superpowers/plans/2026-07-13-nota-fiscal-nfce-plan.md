# Emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Gerar Nota Fiscal" action (in `add-venda.tsx` and `list-venda.tsx`) that emits a real NFC-e for a `Venda`, via a new backend `NfceService` that calls the Focus NFe REST API (homologação by default).

**Architecture:** Backend Spring service (`NfceService`) owns all Focus NFe integration — token, payload building, HTTP call, response parsing — and persists the result on the existing `VendaEntity`. The frontend never talks to Focus NFe directly; it only calls two new endpoints on the existing `VendaController`. Both repos (`vendas/`, `vendas-front/vendas-front/`) are touched; each task states which repo it's in.

**Tech Stack:** Java 11, Spring Boot 2.5.2, Spring MVC `RestTemplate`, MongoDB (Spring Data), Lombok, ModelMapper, JUnit 5 + Mockito + `MockRestServiceServer` (backend). React 17 class components, TypeScript, MUI v5, axios, Jest + React Testing Library (frontend).

## Global Constraints

- No new Maven or npm dependencies are required — `RestTemplate` and Jackson ship with `spring-boot-starter-web`; `ReflectionTestUtils`/`MockRestServiceServer` ship with `spring-boot-starter-test`.
- Focus NFe base URLs: produção `https://api.focusnfe.com.br/v2`, homologação `https://homologacao.focusnfe.com.br/v2`. Auth is HTTP Basic: username = API token, password = empty string. (Source: `doc.focusnfe.com.br/reference/emitir_nfce.md`, `consultar_nfce.md`, fetched 2026-07-13.)
- Emit endpoint: `POST {baseUrl}/nfce?ref={vendaUid}`. Response/error field names: `status` (`autorizado`|`erro_autorizacao`|`denegado`|`cancelado`|`processando_autorizacao`), `chave_nfe`, `caminho_danfe`, `mensagem_sefaz`, `numero_protocolo`.
- Default `focusnfe.ambiente=homologacao` until the user has a real certificate + Focus NFe account (see spec's "Pré-requisitos fora do código"). Never hardcode the API token — always `${FOCUSNFE_TOKEN}` env var.
- Follow existing Lombok convention on every new entity/DTO: `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`.
- Follow existing service convention: `@Service`/`@Component` + `@RequiredArgsConstructor` for `final` collaborator fields; `@Value` for config on non-final fields (matches this codebase's style — no existing `@ConfigurationProperties` classes to follow instead).

---

## File Structure

**Backend (`vendas/src/main/java/com/sorveteria/bomcream/vendas/`):**
- Modify `repository/entity/ProdutoEntity.java`, `controller/dto/ProdutoDTO.java` — fiscal fields.
- Modify `repository/entity/VendaEntity.java`, `controller/dto/VendaDTO.java` — CPF + NFC-e status fields.
- Modify `service/VendaService.java`, `controller/VendaController.java` — `create()` returns the saved DTO; two new NFC-e endpoints.
- Create `config/RestTemplateConfig.java` — the missing `RestTemplate` bean.
- Create `controller/dto/FocusNfeNfceResponseDTO.java` — Jackson mapping of Focus NFe's response.
- Create `service/NfcePayloadBuilder.java` — pure(ish) request-body builder, unit-testable without HTTP.
- Create `service/FocusNfeClient.java` — the only class that talks HTTP to Focus NFe.
- Create `service/NfceService.java` — orchestrates payload → client → persists result on `VendaEntity`.
- Modify `src/main/resources/application.properties` — Focus NFe config.

**Frontend (`vendas-front/vendas-front/src/`):**
- Modify `types/produto.type.ts`, `types/venda.type.ts` — mirror the new backend fields.
- Create `services/nfce.service.ts` — thin wrapper, same style as `venda.service.ts`.
- Modify `components/produto/add-produto.tsx`, `components/produto/edit-produto.tsx` — optional fiscal fields.
- Modify `components/venda/add-venda.tsx` — CPF field, capture `uid` after save, "Gerar Nota Fiscal" button + states.
- Modify `components/venda/list-venda.tsx` — same button + states in the detail panel.

---

### Task 1: Backend — fiscal fields on Produto

**Files:**
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/repository/entity/ProdutoEntity.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/controller/dto/ProdutoDTO.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/ProdutoFiscalMappingTest.java`

**Interfaces:**
- Produces: `ProdutoEntity`/`ProdutoDTO` gain `String ncm`, `String cfop`, `String csosn`, `String unidadeComercial` — consumed by `NfcePayloadBuilder` (Task 6).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.controller.dto.ProdutoDTO;
import com.sorveteria.bomcream.vendas.repository.entity.ProdutoEntity;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProdutoFiscalMappingTest {

    @Test
    void mapsFiscalFieldsBetweenEntityAndDto() {
        ModelMapper mapper = new ModelMapper();

        ProdutoEntity entity = ProdutoEntity.builder()
                .uid("p1")
                .nome("Sorvete 500ml")
                .ncm("21050010")
                .cfop("5102")
                .csosn("102")
                .unidadeComercial("UN")
                .build();

        ProdutoDTO dto = mapper.map(entity, ProdutoDTO.class);

        assertEquals("21050010", dto.getNcm());
        assertEquals("5102", dto.getCfop());
        assertEquals("102", dto.getCsosn());
        assertEquals("UN", dto.getUnidadeComercial());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=ProdutoFiscalMappingTest`
Expected: FAIL — compile error, `ProdutoEntity.builder()` has no `ncm(...)`/`cfop(...)`/`csosn(...)`/`unidadeComercial(...)` methods.

- [ ] **Step 3: Add the fields**

In `ProdutoEntity.java`, add after the existing `categoria` field (line 26):

```java
    private String categoria;
    private String ncm;
    private String cfop;
    private String csosn;
    private String unidadeComercial;
    private LocalDateTime create = LocalDateTime.now();
```

In `ProdutoDTO.java`, add after the existing `categoria` field (line 21):

```java
    private String categoria;
    private String ncm;
    private String cfop;
    private String csosn;
    private String unidadeComercial;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=ProdutoFiscalMappingTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/repository/entity/ProdutoEntity.java \
        src/main/java/com/sorveteria/bomcream/vendas/controller/dto/ProdutoDTO.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/ProdutoFiscalMappingTest.java
git commit -m "feat: add fiscal classification fields to Produto"
```

---

### Task 2: Backend — CPF and NFC-e status fields on Venda

**Files:**
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/repository/entity/VendaEntity.java`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/controller/dto/VendaDTO.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/VendaFiscalMappingTest.java`

**Interfaces:**
- Produces: `VendaEntity`/`VendaDTO` gain `String cpfCliente`, `String nfceStatus`, `String nfceChaveAcesso`, `String nfceDanfeUrl`, `String nfceMotivoErro`, `LocalDateTime nfceEmitidaEm` — consumed by `NfceService` (Task 8) and the frontend (Tasks 10, 12, 13).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.controller.dto.VendaDTO;
import com.sorveteria.bomcream.vendas.repository.entity.VendaEntity;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VendaFiscalMappingTest {

    @Test
    void mapsNfceFieldsBetweenEntityAndDto() {
        ModelMapper mapper = new ModelMapper();
        LocalDateTime emitidaEm = LocalDateTime.of(2026, 7, 13, 10, 0);

        VendaEntity entity = VendaEntity.builder()
                .uid("v1")
                .cpfCliente("12345678900")
                .nfceStatus("autorizada")
                .nfceChaveAcesso("1234")
                .nfceDanfeUrl("https://focusnfe/danfe/1234")
                .nfceMotivoErro(null)
                .nfceEmitidaEm(emitidaEm)
                .build();

        VendaDTO dto = mapper.map(entity, VendaDTO.class);

        assertEquals("12345678900", dto.getCpfCliente());
        assertEquals("autorizada", dto.getNfceStatus());
        assertEquals("1234", dto.getNfceChaveAcesso());
        assertEquals("https://focusnfe/danfe/1234", dto.getNfceDanfeUrl());
        assertEquals(emitidaEm, dto.getNfceEmitidaEm());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=VendaFiscalMappingTest`
Expected: FAIL — compile error, no such builder methods on `VendaEntity`.

- [ ] **Step 3: Add the fields**

In `VendaEntity.java`, add after the existing `formaPagamento` field (line 31):

```java
    private String formaPagamento;
    private String cpfCliente;
    private String nfceStatus;
    private String nfceChaveAcesso;
    private String nfceDanfeUrl;
    private String nfceMotivoErro;
    private LocalDateTime nfceEmitidaEm;
    private LocalDateTime create = LocalDateTime.now();
```

In `VendaDTO.java`, add after the existing `formaPagamento` field (line 27):

```java
    private String formaPagamento;
    private String cpfCliente;
    private String nfceStatus;
    private String nfceChaveAcesso;
    private String nfceDanfeUrl;
    private String nfceMotivoErro;
    private LocalDateTime nfceEmitidaEm;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=VendaFiscalMappingTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/repository/entity/VendaEntity.java \
        src/main/java/com/sorveteria/bomcream/vendas/controller/dto/VendaDTO.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/VendaFiscalMappingTest.java
git commit -m "feat: add CPF and NFC-e status fields to Venda"
```

---

### Task 3: Backend — `VendaService.create` returns the saved DTO (with generated `uid`)

Today `VendaController.create()` returns an empty `200 OK` body — the frontend has no way to learn the Mongo-generated `uid` of the sale it just created. The NFC-e button needs that `uid`. This is a required fix, not a tangential refactor: without it, nothing downstream can reference "the sale I just saved."

**Files:**
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/service/VendaService.java:22-24`
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/controller/VendaController.java:39-43`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/VendaServiceTest.java`

**Interfaces:**
- Consumes: `VendaRepository.save(VendaEntity)` (existing, returns the saved entity with `uid` populated by Spring Data MongoDB).
- Produces: `VendaService.create(VendaDTO dto)` now returns `VendaDTO` (was `void`) — consumed by `VendaController.create` (this task) and, transitively, by the frontend's `finalizarVenda()` (Task 12).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.controller.dto.VendaDTO;
import com.sorveteria.bomcream.vendas.repository.VendaRepository;
import com.sorveteria.bomcream.vendas.repository.entity.VendaEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendaServiceTest {

    @Mock
    private VendaRepository repository;

    @InjectMocks
    private VendaService service;

    @Test
    void createReturnsSavedDtoWithGeneratedUid() {
        service = new VendaService(repository, new ModelMapper());

        VendaDTO input = VendaDTO.builder().cliente("Maria").build();
        VendaEntity saved = VendaEntity.builder().uid("v-123").cliente("Maria").build();
        when(repository.save(any(VendaEntity.class))).thenReturn(saved);

        VendaDTO result = service.create(input);

        assertEquals("v-123", result.getUid());
        assertEquals("Maria", result.getCliente());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=VendaServiceTest`
Expected: FAIL — `service.create(input)` returns `void`, can't be assigned to `VendaDTO result`.

- [ ] **Step 3: Change `VendaService.create` to return the saved DTO**

Replace `VendaService.java:22-24`:

```java
    public VendaDTO create(VendaDTO dto) {
        VendaEntity saved = repository.save(mapper.map(dto, VendaEntity.class));
        return mapper.map(saved, VendaDTO.class);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=VendaServiceTest`
Expected: PASS

- [ ] **Step 5: Update the controller to return the body**

Replace `VendaController.java:39-43`:

```java
    @PostMapping
    public ResponseEntity create(@RequestBody VendaDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }
```

- [ ] **Step 6: Rebuild to confirm the controller still compiles**

Run: `cd vendas && mvnw.cmd -q compile`
Expected: BUILD SUCCESS

- [ ] **Step 7: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/service/VendaService.java \
        src/main/java/com/sorveteria/bomcream/vendas/controller/VendaController.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/VendaServiceTest.java
git commit -m "fix: return saved Venda (with generated uid) from create endpoint"
```

---

### Task 4: Backend — Focus NFe config + `RestTemplate` bean

**Files:**
- Modify: `vendas/src/main/resources/application.properties`
- Create: `vendas/src/main/java/com/sorveteria/bomcream/vendas/config/RestTemplateConfig.java`

No test in this task — it's config/wiring with nothing to assert yet; it's exercised by Task 7's `MockRestServiceServer` test.

- [ ] **Step 1: Add Focus NFe properties**

Append to `application.properties`:

```properties
focusnfe.api.token=${FOCUSNFE_TOKEN:}
focusnfe.ambiente=homologacao
focusnfe.cnpj.emitente=35242747000130
focusnfe.fiscal.ncm.padrao=21050010
focusnfe.fiscal.cfop.padrao=5102
focusnfe.fiscal.csosn.padrao=102
```

- [ ] **Step 2: Create the `RestTemplate` bean**

```java
package com.sorveteria.bomcream.vendas.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

- [ ] **Step 3: Confirm the app still boots**

Run: `cd vendas && mvnw.cmd -q compile`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
cd vendas
git add src/main/resources/application.properties \
        src/main/java/com/sorveteria/bomcream/vendas/config/RestTemplateConfig.java
git commit -m "feat: add Focus NFe configuration and RestTemplate bean"
```

---

### Task 5: Backend — Focus NFe response DTO

**Files:**
- Create: `vendas/src/main/java/com/sorveteria/bomcream/vendas/controller/dto/FocusNfeNfceResponseDTO.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/FocusNfeNfceResponseDTOTest.java`

**Interfaces:**
- Produces: `FocusNfeNfceResponseDTO` with `status`, `chaveNfe`, `caminhoDanfe`, `mensagemSefaz`, `numeroProtocolo` — consumed by `FocusNfeClient` (Task 7) and `NfceService` (Task 8).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sorveteria.bomcream.vendas.controller.dto.FocusNfeNfceResponseDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FocusNfeNfceResponseDTOTest {

    @Test
    void deserializesSnakeCaseFocusNfeResponse() throws Exception {
        String json = "{"
                + "\"status\":\"autorizado\","
                + "\"chave_nfe\":\"3526...\","
                + "\"caminho_danfe\":\"https://focusnfe/danfe/abc\","
                + "\"mensagem_sefaz\":\"Autorizado o uso da NFC-e\","
                + "\"numero_protocolo\":\"135260000012345\""
                + "}";

        FocusNfeNfceResponseDTO dto = new ObjectMapper().readValue(json, FocusNfeNfceResponseDTO.class);

        assertEquals("autorizado", dto.getStatus());
        assertEquals("3526...", dto.getChaveNfe());
        assertEquals("https://focusnfe/danfe/abc", dto.getCaminhoDanfe());
        assertEquals("Autorizado o uso da NFC-e", dto.getMensagemSefaz());
        assertEquals("135260000012345", dto.getNumeroProtocolo());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=FocusNfeNfceResponseDTOTest`
Expected: FAIL — class `FocusNfeNfceResponseDTO` does not exist.

- [ ] **Step 3: Create the DTO**

```java
package com.sorveteria.bomcream.vendas.controller.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FocusNfeNfceResponseDTO {
    private String status;

    @JsonProperty("chave_nfe")
    private String chaveNfe;

    @JsonProperty("caminho_danfe")
    private String caminhoDanfe;

    @JsonProperty("mensagem_sefaz")
    private String mensagemSefaz;

    @JsonProperty("numero_protocolo")
    private String numeroProtocolo;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=FocusNfeNfceResponseDTOTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/controller/dto/FocusNfeNfceResponseDTO.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/FocusNfeNfceResponseDTOTest.java
git commit -m "feat: add DTO for parsing Focus NFe NFC-e responses"
```

---

### Task 6: Backend — `NfcePayloadBuilder`

Builds the JSON body Focus NFe expects, filling missing per-product fiscal codes with the configured defaults.

**Files:**
- Create: `vendas/src/main/java/com/sorveteria/bomcream/vendas/service/NfcePayloadBuilder.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/NfcePayloadBuilderTest.java`

**Interfaces:**
- Consumes: `VendaEntity` (Task 2), `ItemVendaEntity.getProduto()` → `ProdutoEntity` (Task 1).
- Produces: `Map<String, Object> build(VendaEntity venda)` — consumed by `NfceService` (Task 8).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.repository.entity.ItemVendaEntity;
import com.sorveteria.bomcream.vendas.repository.entity.ProdutoEntity;
import com.sorveteria.bomcream.vendas.repository.entity.VendaEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NfcePayloadBuilderTest {

    private NfcePayloadBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new NfcePayloadBuilder();
        ReflectionTestUtils.setField(builder, "cnpjEmitente", "35242747000130");
        ReflectionTestUtils.setField(builder, "ncmPadrao", "21050010");
        ReflectionTestUtils.setField(builder, "cfopPadrao", "5102");
        ReflectionTestUtils.setField(builder, "csosnPadrao", "102");
    }

    @Test
    void usesProductFiscalCodesWhenPresent() {
        ProdutoEntity produto = ProdutoEntity.builder()
                .uid("p1").nome("Sorvete 500ml").valor(new BigDecimal("15.00"))
                .ncm("21050020").cfop("5405").csosn("500").unidadeComercial("KG")
                .build();
        VendaEntity venda = venda(produto, new BigDecimal("2"), new BigDecimal("30.00"));

        Map<String, Object> payload = builder.build(venda);

        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        Map<String, Object> item = items.get(0);
        assertEquals("21050020", item.get("codigo_ncm"));
        assertEquals("5405", item.get("cfop"));
        assertEquals("500", item.get("icms_situacao_tributaria"));
        assertEquals("KG", item.get("unidade_comercial"));
    }

    @Test
    void fallsBackToConfiguredDefaultsWhenProductHasNoFiscalCodes() {
        ProdutoEntity produto = ProdutoEntity.builder()
                .uid("p2").nome("Açaí 300ml").valor(new BigDecimal("12.00"))
                .build();
        VendaEntity venda = venda(produto, new BigDecimal("1"), new BigDecimal("12.00"));

        Map<String, Object> payload = builder.build(venda);

        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        Map<String, Object> item = items.get(0);
        assertEquals("21050010", item.get("codigo_ncm"));
        assertEquals("5102", item.get("cfop"));
        assertEquals("102", item.get("icms_situacao_tributaria"));
        assertEquals("UN", item.get("unidade_comercial"));
        assertEquals("35242747000130", payload.get("cnpj_emitente"));
    }

    private VendaEntity venda(ProdutoEntity produto, BigDecimal quantidade, BigDecimal valorItem) {
        ItemVendaEntity item = ItemVendaEntity.builder()
                .produto(produto).quantidade(quantidade).valorItem(valorItem)
                .build();
        return VendaEntity.builder()
                .uid("v1").itens(List.of(item)).valorTotal(valorItem)
                .formaPagamento("Dinheiro").create(LocalDateTime.now())
                .build();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=NfcePayloadBuilderTest`
Expected: FAIL — class `NfcePayloadBuilder` does not exist.

- [ ] **Step 3: Implement the builder**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.repository.entity.ItemVendaEntity;
import com.sorveteria.bomcream.vendas.repository.entity.ProdutoEntity;
import com.sorveteria.bomcream.vendas.repository.entity.VendaEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NfcePayloadBuilder {

    @Value("${focusnfe.cnpj.emitente}")
    private String cnpjEmitente;

    @Value("${focusnfe.fiscal.ncm.padrao}")
    private String ncmPadrao;

    @Value("${focusnfe.fiscal.cfop.padrao}")
    private String cfopPadrao;

    @Value("${focusnfe.fiscal.csosn.padrao}")
    private String csosnPadrao;

    private static final DateTimeFormatter DATA_EMISSAO_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public Map<String, Object> build(VendaEntity venda) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("cnpj_emitente", cnpjEmitente);
        payload.put("data_emissao", venda.getCreate().format(DATA_EMISSAO_FORMAT) + "-03:00");
        payload.put("presenca_comprador", "1");
        payload.put("modalidade_frete", "9");
        payload.put("local_destino", "1");
        payload.put("natureza_operacao", "Venda de mercadoria");
        payload.put("indicador_inscricao_estadual_destinatario", "9");
        if (venda.getCpfCliente() != null && !venda.getCpfCliente().isBlank()) {
            payload.put("cpf_destinatario", venda.getCpfCliente());
        }
        payload.put("items", buildItems(venda.getItens()));
        payload.put("formas_pagamento", List.of(buildFormaPagamento(venda)));
        return payload;
    }

    private List<Map<String, Object>> buildItems(Iterable<ItemVendaEntity> itens) {
        List<Map<String, Object>> items = new ArrayList<>();
        int numero = 1;
        for (ItemVendaEntity itemVenda : itens) {
            ProdutoEntity produto = itemVenda.getProduto();
            String unidade = orDefault(produto.getUnidadeComercial(), "UN");

            Map<String, Object> item = new HashMap<>();
            item.put("numero_item", numero++);
            item.put("codigo_produto", produto.getUid());
            item.put("descricao", produto.getNome());
            item.put("codigo_ncm", orDefault(produto.getNcm(), ncmPadrao));
            item.put("cfop", orDefault(produto.getCfop(), cfopPadrao));
            item.put("unidade_comercial", unidade);
            item.put("unidade_tributavel", unidade);
            item.put("quantidade_comercial", itemVenda.getQuantidade());
            item.put("quantidade_tributavel", itemVenda.getQuantidade());
            item.put("valor_unitario_comercial", produto.getValor());
            item.put("valor_unitario_tributavel", produto.getValor());
            item.put("valor_bruto", itemVenda.getValorItem());
            item.put("icms_origem", "0");
            item.put("icms_situacao_tributaria", orDefault(produto.getCsosn(), csosnPadrao));
            items.add(item);
        }
        return items;
    }

    private Map<String, Object> buildFormaPagamento(VendaEntity venda) {
        Map<String, Object> forma = new HashMap<>();
        forma.put("forma_pagamento", codigoFormaPagamento(venda.getFormaPagamento()));
        forma.put("valor_pagamento", venda.getValorTotal());
        return forma;
    }

    private String codigoFormaPagamento(String formaPagamento) {
        switch (formaPagamento) {
            case "Credito":
                return "03";
            case "Debito":
                return "04";
            case "PIX":
                return "17";
            case "Dinheiro":
            default:
                return "01";
        }
    }

    private String orDefault(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=NfcePayloadBuilderTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/service/NfcePayloadBuilder.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/NfcePayloadBuilderTest.java
git commit -m "feat: build Focus NFe NFC-e request payload from Venda"
```

---

### Task 7: Backend — `FocusNfeClient`

The only class that makes the HTTP call. Handles both success and error-with-JSON-body responses (Focus NFe returns rejection details in the body even on non-2xx statuses).

**Files:**
- Create: `vendas/src/main/java/com/sorveteria/bomcream/vendas/service/FocusNfeClient.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/FocusNfeClientTest.java`

**Interfaces:**
- Consumes: `RestTemplate` (Task 4), `Map<String, Object>` payload (Task 6's output shape).
- Produces: `FocusNfeNfceResponseDTO emitir(String ref, Map<String, Object> payload)` — consumed by `NfceService` (Task 8).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.controller.dto.FocusNfeNfceResponseDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class FocusNfeClientTest {

    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private FocusNfeClient client;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.createServer(restTemplate);
        client = new FocusNfeClient(restTemplate, new com.fasterxml.jackson.databind.ObjectMapper());
        ReflectionTestUtils.setField(client, "token", "test-token");
        ReflectionTestUtils.setField(client, "ambiente", "homologacao");
    }

    @Test
    void parsesSuccessfulAuthorization() {
        server.expect(requestTo("https://homologacao.focusnfe.com.br/v2/nfce?ref=v1"))
                .andExpect(method(POST))
                .andRespond(withSuccess(
                        "{\"status\":\"autorizado\",\"chave_nfe\":\"123\",\"caminho_danfe\":\"https://x/danfe\"}",
                        MediaType.APPLICATION_JSON));

        FocusNfeNfceResponseDTO result = client.emitir("v1", Map.of("cnpj_emitente", "35242747000130"));

        assertEquals("autorizado", result.getStatus());
        assertEquals("123", result.getChaveNfe());
    }

    @Test
    void parsesRejectionBodyOnErrorStatus() {
        server.expect(requestTo("https://homologacao.focusnfe.com.br/v2/nfce?ref=v2"))
                .andExpect(method(POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("{\"status\":\"erro_autorizacao\",\"mensagem_sefaz\":\"Rejeicao: 539\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        FocusNfeNfceResponseDTO result = client.emitir("v2", Map.of("cnpj_emitente", "35242747000130"));

        assertEquals("erro_autorizacao", result.getStatus());
        assertEquals("Rejeicao: 539", result.getMensagemSefaz());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=FocusNfeClientTest`
Expected: FAIL — class `FocusNfeClient` does not exist.

- [ ] **Step 3: Implement the client**

```java
package com.sorveteria.bomcream.vendas.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sorveteria.bomcream.vendas.controller.dto.FocusNfeNfceResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class FocusNfeClient {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${focusnfe.api.token}")
    private String token;

    @Value("${focusnfe.ambiente}")
    private String ambiente;

    public FocusNfeNfceResponseDTO emitir(String ref, Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(token, "");
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        String url = baseUrl() + "/nfce?ref=" + ref;

        try {
            ResponseEntity<FocusNfeNfceResponseDTO> response = restTemplate.exchange(
                    url, HttpMethod.POST, request, FocusNfeNfceResponseDTO.class);
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            return parseErrorBody(e.getResponseBodyAsString());
        }
    }

    private String baseUrl() {
        return "producao".equals(ambiente)
                ? "https://api.focusnfe.com.br/v2"
                : "https://homologacao.focusnfe.com.br/v2";
    }

    private FocusNfeNfceResponseDTO parseErrorBody(String body) {
        try {
            return objectMapper.readValue(body, FocusNfeNfceResponseDTO.class);
        } catch (JsonProcessingException e) {
            FocusNfeNfceResponseDTO erro = new FocusNfeNfceResponseDTO();
            erro.setStatus("erro");
            erro.setMensagemSefaz(body);
            return erro;
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=FocusNfeClientTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/service/FocusNfeClient.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/FocusNfeClientTest.java
git commit -m "feat: add HTTP client for Focus NFe NFC-e emission"
```

---

### Task 8: Backend — `NfceService` orchestration

**Files:**
- Create: `vendas/src/main/java/com/sorveteria/bomcream/vendas/service/NfceService.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/service/NfceServiceTest.java`

**Interfaces:**
- Consumes: `VendaRepository` (existing), `FocusNfeClient.emitir(String, Map)` (Task 7), `NfcePayloadBuilder.build(VendaEntity)` (Task 6).
- Produces: `VendaDTO emitir(String vendaId)`, `VendaDTO consultarStatus(String vendaId)` — consumed by `VendaController` (Task 9).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.controller.dto.FocusNfeNfceResponseDTO;
import com.sorveteria.bomcream.vendas.controller.dto.VendaDTO;
import com.sorveteria.bomcream.vendas.repository.VendaRepository;
import com.sorveteria.bomcream.vendas.repository.entity.VendaEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NfceServiceTest {

    @Mock
    private VendaRepository vendaRepository;
    @Mock
    private FocusNfeClient focusNfeClient;
    @Mock
    private NfcePayloadBuilder payloadBuilder;

    private NfceService service;

    private VendaEntity vendaSalva(String uid) {
        return VendaEntity.builder().uid(uid).build();
    }

    @Test
    void authorizedResponseMarksVendaAsAutorizada() {
        service = new NfceService(vendaRepository, focusNfeClient, payloadBuilder, new ModelMapper());
        VendaEntity venda = vendaSalva("v1");
        when(vendaRepository.findById("v1")).thenReturn(Optional.of(venda));
        when(payloadBuilder.build(venda)).thenReturn(Map.of());
        FocusNfeNfceResponseDTO resposta = new FocusNfeNfceResponseDTO();
        resposta.setStatus("autorizado");
        resposta.setChaveNfe("chave-123");
        resposta.setCaminhoDanfe("https://x/danfe");
        when(focusNfeClient.emitir(anyString(), any())).thenReturn(resposta);
        when(vendaRepository.save(any(VendaEntity.class))).thenAnswer(i -> i.getArgument(0));

        VendaDTO result = service.emitir("v1");

        assertEquals("autorizada", result.getNfceStatus());
        assertEquals("chave-123", result.getNfceChaveAcesso());
        assertEquals("https://x/danfe", result.getNfceDanfeUrl());
        assertNull(result.getNfceMotivoErro());
    }

    @Test
    void rejectedResponseMarksVendaAsRejeitadaWithReason() {
        service = new NfceService(vendaRepository, focusNfeClient, payloadBuilder, new ModelMapper());
        VendaEntity venda = vendaSalva("v2");
        when(vendaRepository.findById("v2")).thenReturn(Optional.of(venda));
        when(payloadBuilder.build(venda)).thenReturn(Map.of());
        FocusNfeNfceResponseDTO resposta = new FocusNfeNfceResponseDTO();
        resposta.setStatus("erro_autorizacao");
        resposta.setMensagemSefaz("Rejeicao: 539 - Duplicidade de NFC-e");
        when(focusNfeClient.emitir(anyString(), any())).thenReturn(resposta);
        when(vendaRepository.save(any(VendaEntity.class))).thenAnswer(i -> i.getArgument(0));

        VendaDTO result = service.emitir("v2");

        assertEquals("rejeitada", result.getNfceStatus());
        assertEquals("Rejeicao: 539 - Duplicidade de NFC-e", result.getNfceMotivoErro());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=NfceServiceTest`
Expected: FAIL — class `NfceService` does not exist.

- [ ] **Step 3: Implement the service**

```java
package com.sorveteria.bomcream.vendas.service;

import com.sorveteria.bomcream.vendas.controller.dto.FocusNfeNfceResponseDTO;
import com.sorveteria.bomcream.vendas.controller.dto.VendaDTO;
import com.sorveteria.bomcream.vendas.repository.VendaRepository;
import com.sorveteria.bomcream.vendas.repository.entity.VendaEntity;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NfceService {
    private final VendaRepository vendaRepository;
    private final FocusNfeClient focusNfeClient;
    private final NfcePayloadBuilder payloadBuilder;
    private final ModelMapper mapper;

    public VendaDTO emitir(String vendaId) {
        VendaEntity venda = buscarVenda(vendaId);

        Map<String, Object> payload = payloadBuilder.build(venda);
        FocusNfeNfceResponseDTO resposta = focusNfeClient.emitir(venda.getUid(), payload);

        aplicarResposta(venda, resposta);
        VendaEntity salva = vendaRepository.save(venda);

        return mapper.map(salva, VendaDTO.class);
    }

    public VendaDTO consultarStatus(String vendaId) {
        return mapper.map(buscarVenda(vendaId), VendaDTO.class);
    }

    private VendaEntity buscarVenda(String vendaId) {
        return vendaRepository.findById(vendaId)
                .orElseThrow(() -> new RuntimeException("Venda não encontrada"));
    }

    private void aplicarResposta(VendaEntity venda, FocusNfeNfceResponseDTO resposta) {
        venda.setNfceEmitidaEm(LocalDateTime.now());
        String status = resposta.getStatus();

        if ("autorizado".equals(status)) {
            venda.setNfceStatus("autorizada");
            venda.setNfceChaveAcesso(resposta.getChaveNfe());
            venda.setNfceDanfeUrl(resposta.getCaminhoDanfe());
            venda.setNfceMotivoErro(null);
        } else if ("processando_autorizacao".equals(status)) {
            venda.setNfceStatus("processando");
        } else if ("erro_autorizacao".equals(status) || "denegado".equals(status)) {
            venda.setNfceStatus("rejeitada");
            venda.setNfceMotivoErro(resposta.getMensagemSefaz());
        } else {
            venda.setNfceStatus("erro");
            venda.setNfceMotivoErro(resposta.getMensagemSefaz());
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=NfceServiceTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/service/NfceService.java \
        src/test/java/com/sorveteria/bomcream/vendas/service/NfceServiceTest.java
git commit -m "feat: orchestrate NFC-e emission and persist result on Venda"
```

---

### Task 9: Backend — NFC-e endpoints on `VendaController`

**Files:**
- Modify: `vendas/src/main/java/com/sorveteria/bomcream/vendas/controller/VendaController.java`
- Test: `vendas/src/test/java/com/sorveteria/bomcream/vendas/controller/VendaControllerNfceTest.java`

**Interfaces:**
- Consumes: `NfceService.emitir(String)`, `NfceService.consultarStatus(String)` (Task 8).
- Produces: `POST /v1/vendas/{id}/nfce`, `GET /v1/vendas/{id}/nfce` — consumed by frontend `nfce.service.ts` (Task 10).

- [ ] **Step 1: Write the failing test**

```java
package com.sorveteria.bomcream.vendas.controller;

import com.sorveteria.bomcream.vendas.controller.dto.VendaDTO;
import com.sorveteria.bomcream.vendas.service.NfceService;
import com.sorveteria.bomcream.vendas.service.VendaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendaControllerNfceTest {

    @Mock
    private VendaService vendaService;
    @Mock
    private NfceService nfceService;

    @Test
    void postEmitsNfceAndReturnsUpdatedVenda() {
        VendaController controller = new VendaController(vendaService, nfceService);
        VendaDTO dto = VendaDTO.builder().uid("v1").nfceStatus("autorizada").build();
        when(nfceService.emitir("v1")).thenReturn(dto);

        ResponseEntity response = controller.emitirNfce("v1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(dto, response.getBody());
    }

    @Test
    void getReturnsCurrentNfceStatusWithoutReemitting() {
        VendaController controller = new VendaController(vendaService, nfceService);
        VendaDTO dto = VendaDTO.builder().uid("v1").nfceStatus("autorizada").build();
        when(nfceService.consultarStatus("v1")).thenReturn(dto);

        ResponseEntity response = controller.consultarNfce("v1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(dto, response.getBody());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas && mvnw.cmd test -Dtest=VendaControllerNfceTest`
Expected: FAIL — `VendaController` has no `NfceService` constructor param, no `emitirNfce`/`consultarNfce` methods.

- [ ] **Step 3: Add the `NfceService` dependency and the two endpoints**

`VendaController` already uses `@RequiredArgsConstructor` over a single `private final VendaService service;` (line 15). Add a second final field so Lombok's generated constructor takes both:

```java
    private final VendaService service;
    private final NfceService nfceService;
```

Add these two methods (after `deleteAll()`, before the closing brace):

```java
    @PostMapping("/{id}/nfce")
    public ResponseEntity emitirNfce(@PathVariable String id) {
        try {
            return ResponseEntity.ok(nfceService.emitir(id));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/nfce")
    public ResponseEntity consultarNfce(@PathVariable String id) {
        try {
            return ResponseEntity.ok(nfceService.consultarStatus(id));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
```

Add the import: `import com.sorveteria.bomcream.vendas.service.NfceService;`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendas && mvnw.cmd test -Dtest=VendaControllerNfceTest`
Expected: PASS

- [ ] **Step 5: Run the full backend test suite**

Run: `cd vendas && mvnw.cmd test`
Expected: BUILD SUCCESS, all tests from Tasks 1-9 pass.

- [ ] **Step 6: Commit**

```bash
cd vendas
git add src/main/java/com/sorveteria/bomcream/vendas/controller/VendaController.java \
        src/test/java/com/sorveteria/bomcream/vendas/controller/VendaControllerNfceTest.java
git commit -m "feat: add POST/GET /v1/vendas/{id}/nfce endpoints"
```

Backend work ends here. From this point every task is in `vendas-front/vendas-front/`.

---

### Task 10: Frontend — types + `nfce.service.ts`

**Files:**
- Modify: `vendas-front/vendas-front/src/types/produto.type.ts`
- Modify: `vendas-front/vendas-front/src/types/venda.type.ts`
- Create: `vendas-front/vendas-front/src/services/nfce.service.ts`
- Test: `vendas-front/vendas-front/src/services/nfce.service.test.ts`

**Interfaces:**
- Produces: `NfceService.emitir(vendaId: string)`, `NfceService.consultarStatus(vendaId: string)` — consumed by `add-venda.tsx` (Task 12) and `list-venda.tsx` (Task 13).

- [ ] **Step 1: Update `produto.type.ts`**

```ts
export default interface ProdutoDTO {
  uid?: any | null,
  nome: string,
  valor: number,
  tipoMedida: string,
  categoria: string,
  ncm?: string | null,
  cfop?: string | null,
  csosn?: string | null,
  unidadeComercial?: string | null,
}
```

- [ ] **Step 2: Update `venda.type.ts`**

```ts
export default interface VendaDTO {
    uid?: string | null,
    caixa: string | null,
    cliente?: string | null,
    cpfCliente?: string | null,
    itens: Array<VendaItemDTO>,
    valorDesconto: number,
    valorTotal: number,
    valorPago: number,
    valorTroco: number,
    formaPagamento: string,
    create: string,
    nfceStatus?: string | null,
    nfceChaveAcesso?: string | null,
    nfceDanfeUrl?: string | null,
    nfceMotivoErro?: string | null,
    nfceEmitidaEm?: string | null,
  }
```

- [ ] **Step 3: Write the failing test for `nfce.service.ts`**

```ts
import http from "../http-common";
import NfceService from "./nfce.service";

jest.mock("../http-common");

describe("NfceService", () => {
  afterEach(() => jest.clearAllMocks());

  it("emitir posts to /vendas/{id}/nfce", () => {
    (http.post as jest.Mock).mockResolvedValue({ data: {} });
    NfceService.emitir("v1");
    expect(http.post).toHaveBeenCalledWith("/vendas/v1/nfce");
  });

  it("consultarStatus gets /vendas/{id}/nfce", () => {
    (http.get as jest.Mock).mockResolvedValue({ data: {} });
    NfceService.consultarStatus("v1");
    expect(http.get).toHaveBeenCalledWith("/vendas/v1/nfce");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd vendas-front/vendas-front && npx react-scripts test src/services/nfce.service.test.ts --watchAll=false`
Expected: FAIL — cannot find module `./nfce.service`.

- [ ] **Step 5: Create `nfce.service.ts`**

```ts
import http from "../http-common";
import VendaDTO from "../types/venda.type";

class NfceService {

  emitir(vendaId: string) {
    return http.post<VendaDTO>(`/vendas/${vendaId}/nfce`);
  }

  consultarStatus(vendaId: string) {
    return http.get<VendaDTO>(`/vendas/${vendaId}/nfce`);
  }

}

export default new NfceService();
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd vendas-front/vendas-front && npx react-scripts test src/services/nfce.service.test.ts --watchAll=false`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd vendas-front/vendas-front
git add src/types/produto.type.ts src/types/venda.type.ts \
        src/services/nfce.service.ts src/services/nfce.service.test.ts
git commit -m "feat: add NFC-e fields to types and nfce.service.ts"
```

---

### Task 11: Frontend — optional fiscal fields on the Produto form

**Files:**
- Modify: `vendas-front/vendas-front/src/components/produto/add-produto.tsx`
- Modify: `vendas-front/vendas-front/src/components/produto/edit-produto.tsx`

No test — this is plain form-field wiring identical in shape to the four fields already in these files (`nome`, `valor`, etc.); the payload correctness is already covered by Task 6's backend test.

- [ ] **Step 1: `add-produto.tsx` — bind new change handlers**

In the constructor (after line 29's `this.onChangeCategoria = this.onChangeCategoria.bind(this);`):

```js
        this.onChangeNcm = this.onChangeNcm.bind(this);
        this.onChangeCfop = this.onChangeCfop.bind(this);
        this.onChangeCsosn = this.onChangeCsosn.bind(this);
        this.onChangeUnidadeComercial = this.onChangeUnidadeComercial.bind(this);
```

In `this.state = {...}` (after line 37's `categoria: "",`):

```js
            ncm: "",
            cfop: "",
            csosn: "",
            unidadeComercial: "",
```

After `onChangeCategoria` (line 90):

```js
    onChangeNcm(e: ChangeEvent<HTMLInputElement>) {
        this.setState({ ncm: e.target.value });
    }

    onChangeCfop(e: ChangeEvent<HTMLInputElement>) {
        this.setState({ cfop: e.target.value });
    }

    onChangeCsosn(e: ChangeEvent<HTMLInputElement>) {
        this.setState({ csosn: e.target.value });
    }

    onChangeUnidadeComercial(e: ChangeEvent<HTMLInputElement>) {
        this.setState({ unidadeComercial: e.target.value });
    }
```

In `saveProduto()`'s `data` object (line 93-99), add:

```js
            ncm: this.state.ncm || null,
            cfop: this.state.cfop || null,
            csosn: this.state.csosn || null,
            unidadeComercial: this.state.unidadeComercial || null,
```

In `newProduto()` (line 113-122), add the same four fields reset to `""`.

In `render()`'s destructuring (line 125), add `ncm, cfop, csosn, unidadeComercial,`.

After the "Categoria" `Grid item` (closes at line 202) and before the buttons `Grid item` (line 203), add:

```jsx
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mt: 1 }}>Classificação fiscal (opcional)</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="NCM" value={ncm} onChange={this.onChangeNcm} name="ncm" />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="CFOP" value={cfop} onChange={this.onChangeCfop} name="cfop" />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="CSOSN" value={csosn} onChange={this.onChangeCsosn} name="csosn" />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="Unidade comercial" value={unidadeComercial} onChange={this.onChangeUnidadeComercial} name="unidadeComercial" />
                            </Grid>
```

- [ ] **Step 2: `edit-produto.tsx` — same fields, `prevState` spread style**

In the constructor bindings (after line 32's `this.onChangeCategoria = this.onChangeCategoria.bind(this);`):

```js
    this.onChangeNcm = this.onChangeNcm.bind(this);
    this.onChangeCfop = this.onChangeCfop.bind(this);
    this.onChangeCsosn = this.onChangeCsosn.bind(this);
    this.onChangeUnidadeComercial = this.onChangeUnidadeComercial.bind(this);
```

After `onChangeCategoria` (line 116):

```js
  onChangeNcm(e: ChangeEvent<HTMLInputElement>) {
    const ncm = e.target.value;
    this.setState((prevState) => ({ currentProduto: { ...prevState.currentProduto, ncm } }));
  }

  onChangeCfop(e: ChangeEvent<HTMLInputElement>) {
    const cfop = e.target.value;
    this.setState((prevState) => ({ currentProduto: { ...prevState.currentProduto, cfop } }));
  }

  onChangeCsosn(e: ChangeEvent<HTMLInputElement>) {
    const csosn = e.target.value;
    this.setState((prevState) => ({ currentProduto: { ...prevState.currentProduto, csosn } }));
  }

  onChangeUnidadeComercial(e: ChangeEvent<HTMLInputElement>) {
    const unidadeComercial = e.target.value;
    this.setState((prevState) => ({ currentProduto: { ...prevState.currentProduto, unidadeComercial } }));
  }
```

After the "Categoria" `Grid item` (closes at line 227) and before the closing `</Grid>` at line 228, add:

```jsx
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>Classificação fiscal (opcional)</Typography>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="NCM" value={currentProduto.ncm || ""} onChange={this.onChangeNcm} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="CFOP" value={currentProduto.cfop || ""} onChange={this.onChangeCfop} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="CSOSN" value={currentProduto.csosn || ""} onChange={this.onChangeCsosn} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Unidade comercial" value={currentProduto.unidadeComercial || ""} onChange={this.onChangeUnidadeComercial} />
                </Grid>
```

- [ ] **Step 3: Manually verify in the browser**

Run: `cd vendas-front/vendas-front && npm start`, open `/add_produto`, fill NCM/CFOP/CSOSN/Unidade, save, then open `/edit_produto/:id` for that product and confirm the four values round-trip.

- [ ] **Step 4: Commit**

```bash
cd vendas-front/vendas-front
git add src/components/produto/add-produto.tsx src/components/produto/edit-produto.tsx
git commit -m "feat: add optional fiscal classification fields to Produto forms"
```

---

### Task 12: Frontend — `add-venda.tsx`: CPF field, capture `uid`, "Gerar Nota Fiscal"

**Design deviation from the spec, noted explicitly:** the spec said the button goes "ao lado do Imprimir." In the actual code, the whole button row (`itens.length > 0 ? (...) : (...)` at `add-venda.tsx:593`) — including "Imprimir" — is only rendered while the cart is non-empty, and `finalizarVenda()` empties the cart via `newVenda()`. So a button placed there would vanish the instant the sale succeeds, before it could ever be clicked. Instead, "Gerar Nota Fiscal" is rendered next to the existing "Venda registrada com sucesso!" alert, keyed off a new `lastVendaUid` field that survives `newVenda()`'s reset — it appears exactly when there's a just-saved sale to act on, and stays visible after the cart clears for the next customer.

**Files:**
- Modify: `vendas-front/vendas-front/src/components/venda/add-venda.tsx`
- Test: `vendas-front/vendas-front/src/components/venda/add-venda.nfce.test.tsx`

**Interfaces:**
- Consumes: `NfceService.emitir(vendaId: string)` (Task 10), `VendaService.create` now resolving `response.data.uid` (Task 3's backend change).

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddVenda from "./add-venda";
import CaixaService from "../../services/caixa.service";
import CategoriaService from "../../services/categoria.service";
import ProdutoService from "../../services/produto.service";
import NfceService from "../../services/nfce.service";

jest.mock("../../services/caixa.service");
jest.mock("../../services/categoria.service");
jest.mock("../../services/produto.service");
jest.mock("../../services/nfce.service");

beforeEach(() => {
  (CaixaService.get as jest.Mock).mockResolvedValue({ data: { uid: "caixa-1" } });
  (CategoriaService.getAll as jest.Mock).mockResolvedValue({ data: [] });
  (ProdutoService.getAll as jest.Mock).mockResolvedValue({ data: [] });
});

test("Gerar Nota Fiscal appears after a sale is saved and shows the DANFE link on success", async () => {
  const ref: any = { current: null };
  render(<AddVenda ref={ref} />);
  await waitFor(() => expect(CaixaService.get).toHaveBeenCalled());

  act(() => { ref.current.setState({ lastVendaUid: "v1" }); });
  (NfceService.emitir as jest.Mock).mockResolvedValue({
    data: { nfceStatus: "autorizada", nfceChaveAcesso: "chave-1", nfceDanfeUrl: "https://x/danfe" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Gerar Nota Fiscal" }));

  await waitFor(() => expect(screen.getByRole("link", { name: "Ver Nota Fiscal" })).toBeInTheDocument());
  expect(screen.getByRole("link", { name: "Ver Nota Fiscal" })).toHaveAttribute("href", "https://x/danfe");
});

test("shows the SEFAZ rejection reason and allows retrying", async () => {
  const ref: any = { current: null };
  render(<AddVenda ref={ref} />);
  await waitFor(() => expect(CaixaService.get).toHaveBeenCalled());

  act(() => { ref.current.setState({ lastVendaUid: "v2" }); });
  (NfceService.emitir as jest.Mock).mockResolvedValue({
    data: { nfceStatus: "rejeitada", nfceMotivoErro: "Rejeicao: 539 - Duplicidade de NFC-e" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Gerar Nota Fiscal" }));

  await waitFor(() => expect(screen.getByText("Rejeicao: 539 - Duplicidade de NFC-e")).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Tentar Novamente" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas-front/vendas-front && npx react-scripts test src/components/venda/add-venda.nfce.test.tsx --watchAll=false`
Expected: FAIL — `ref.current.setState` errors (class instance not yet exposing `lastVendaUid`), no "Gerar Nota Fiscal" button in the DOM.

- [ ] **Step 3: Add state fields**

Extend the `State` type (`add-venda.tsx:22-32`):

```ts
type State = VendaDTO & {
    produtos: Array<ProdutoDTO>,
    vendasEmAberto: Array<VendaDTO>,
    currentItem: VendaItemDTO | null,
    produtoID: string,
    produtoNome: string | null,
    categorias: Array<CategoriaDTO>,
    open: boolean,
    msg: string,
    openModel: boolean,
    lastVendaUid: string | null,
    nfceLoading: boolean,
};
```

Add to the constructor's initial state (after `openModel: false,` at line 74):

```js
            lastVendaUid: null,
            nfceLoading: false,
            cpfCliente: "",
            nfceStatus: null,
            nfceChaveAcesso: null,
            nfceDanfeUrl: null,
            nfceMotivoErro: null,
```

- [ ] **Step 4: Bind the new handlers**

In the constructor, after `this.onChangeCliente = this.onChangeCliente.bind(this);` (line 50):

```js
        this.onChangeCpfCliente = this.onChangeCpfCliente.bind(this);
        this.gerarNotaFiscal = this.gerarNotaFiscal.bind(this);
```

- [ ] **Step 5: Add `NfceService` import**

At the top, after `import VendaService from "../../services/venda.service";` (line 7):

```js
import NfceService from "../../services/nfce.service";
```

- [ ] **Step 6: Add `onChangeCpfCliente` and `gerarNotaFiscal` methods**

After `onChangeCliente` (`add-venda.tsx:232-237`):

```js
    onChangeCpfCliente(e: ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
        this.setState({
            cpfCliente: raw,
        });
    }
```

After `imprimir()` (`add-venda.tsx:421-423`):

```js
    gerarNotaFiscal() {
        if (!this.state.lastVendaUid) {
            return;
        }
        this.setState({ nfceLoading: true });
        NfceService.emitir(this.state.lastVendaUid)
            .then((response: any) => {
                this.setState({
                    nfceLoading: false,
                    nfceStatus: response.data.nfceStatus,
                    nfceChaveAcesso: response.data.nfceChaveAcesso,
                    nfceDanfeUrl: response.data.nfceDanfeUrl,
                    nfceMotivoErro: response.data.nfceMotivoErro,
                });
            })
            .catch((e: Error) => {
                this.setState({
                    nfceLoading: false,
                    nfceStatus: "erro",
                    nfceMotivoErro: "Falha ao comunicar com o servidor",
                });
            });
    }
```

- [ ] **Step 7: Capture the created sale's `uid` in `finalizarVenda`, and only clear the cart after the save actually succeeds**

Replace `finalizarVenda()` (`add-venda.tsx:245-279`):

```js
    finalizarVenda() {
        if (!this.state.valorPago || this.state.valorPago <= 0) {
            this.setState({
                open: true,
                msg: "Valor Pago deve ser maior que zero",
            });
            return;
        }

        const stringDate = moment(new Date()).format('yyyy-MM-DDTHH:mm:ss');
        const data: VendaDTO = {
            caixa: this.state.caixa,
            itens: this.state.itens,
            valorDesconto: this.state.valorDesconto,
            valorTotal: this.state.valorTotal,
            create: stringDate,
            formaPagamento: this.state.formaPagamento,
            valorPago: this.state.valorPago,
            valorTroco: this.state.valorTroco,
            cliente: this.state.cliente,
            cpfCliente: this.state.cpfCliente,
        };

        VendaService.create(data)
            .then((response: any) => {
                this.setState({
                    open: true,
                    msg: "Venda registrada com sucesso!",
                    lastVendaUid: response.data.uid,
                    nfceStatus: null,
                    nfceChaveAcesso: null,
                    nfceDanfeUrl: null,
                    nfceMotivoErro: null,
                });
                this.newVenda();
            })
            .catch((e: Error) => {
                console.log(e);
            });
    }
```

(This moves `this.newVenda()` inside the `.then()`. Previously it ran synchronously right after `VendaService.create(...)`, clearing the cart immediately regardless of whether the save succeeded — before this task there was no need to wait, since nothing depended on the response. Now the button needs the server-generated `uid`, so the cart only clears once the save is confirmed.)

- [ ] **Step 8: Add the CPF field next to Cliente, and shrink both to make room**

Replace the Cliente `Grid item` and the buttons `Grid item` (`add-venda.tsx:655-675`):

```jsx
                                        <Grid item xs={12} md={3}>
                                            <TextField id="clienteNome" label="Cliente" variant="outlined"
                                                type="text"
                                                fullWidth
                                                value={cliente}
                                                onChange={this.onChangeCliente}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <TextField id="cpfCliente" label="CPF do cliente (opcional)" variant="outlined"
                                                type="text"
                                                fullWidth
                                                value={cpfCliente}
                                                onChange={this.onChangeCpfCliente}
                                                inputProps={{ maxLength: 11 }}
                                                helperText="Deixe em branco p/ consumidor não identificado"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                                                <Button onClick={this.pagamentoPendente} variant="outlined" color="secondary" size="medium">
                                                    Pagamento pendente
                                                </Button>
                                                <Button onClick={this.finalizarVenda} variant="contained" color="primary" size="medium">
                                                    Finalizar Compra
                                                </Button>
                                                <Button onClick={this.imprimir} variant="contained" color="primary" size="medium">
                                                    Imprimir
                                                </Button>
                                            </Box>
                                        </Grid>
```

(Note: `id="valorPago"` on the Cliente field was a pre-existing duplicate id — reused from the "Valor Pago" field above it. Renamed to `id="clienteNome"` here since a second duplicate would make the CPF field's `id="cpfCliente"` collide in spirit; this rename doesn't change behavior since the id wasn't used for anything but DOM identity.)

- [ ] **Step 9: Render the "Gerar Nota Fiscal" block next to the success alert**

Replace the `Collapse`/`Alert` block (`add-venda.tsx:442-447`) with the same block plus the new one right after it:

```jsx
                <FormControl fullWidth>
                    <Collapse in={open} addEndListener={this.finalizaAlert}>
                        <Alert severity={msg === "Venda registrada com sucesso!" ? "success" : "error"}
                            color={msg === "Venda registrada com sucesso!" ? "success" : "error"}>
                            {msg}
                        </Alert>
                    </Collapse>
                    {lastVendaUid && (
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                            {nfceStatus === "autorizada" ? (
                                <Button variant="outlined" color="success" href={nfceDanfeUrl || undefined} target="_blank" rel="noopener noreferrer">
                                    Ver Nota Fiscal
                                </Button>
                            ) : (
                                <Button variant="contained" color="primary" onClick={this.gerarNotaFiscal} disabled={nfceLoading}>
                                    {nfceLoading ? "Emitindo..." : (nfceStatus === "rejeitada" || nfceStatus === "erro") ? "Tentar Novamente" : "Gerar Nota Fiscal"}
                                </Button>
                            )}
                            {(nfceStatus === "rejeitada" || nfceStatus === "erro") && nfceMotivoErro && (
                                <Alert severity="error">{nfceMotivoErro}</Alert>
                            )}
                        </Box>
                    )}
```

- [ ] **Step 10: Destructure the new state fields in `render()`**

Replace the destructuring line (`add-venda.tsx:435-436`):

```js
        const { produtos, currentItem, itens, valorTotal, formaPagamento, cliente, cpfCliente, caixa, openModel,
            valorPago, valorTroco, produtoID, produtoNome, categorias, open, msg, vendasEmAberto,
            lastVendaUid, nfceLoading, nfceStatus, nfceChaveAcesso, nfceDanfeUrl, nfceMotivoErro } = this.state;
```

- [ ] **Step 11: Run test to verify it passes**

Run: `cd vendas-front/vendas-front && npx react-scripts test src/components/venda/add-venda.nfce.test.tsx --watchAll=false`
Expected: PASS

- [ ] **Step 12: Manually verify in the browser**

Run: `cd vendas-front/vendas-front && npm start`, open a caixa, add an item to the cart, fill Cliente/CPF, click "Finalizar Compra," confirm "Gerar Nota Fiscal" appears next to the success alert and stays visible after the cart clears.

- [ ] **Step 13: Commit**

```bash
cd vendas-front/vendas-front
git add src/components/venda/add-venda.tsx src/components/venda/add-venda.nfce.test.tsx
git commit -m "feat: add CPF field and Gerar Nota Fiscal action to add-venda"
```

---

### Task 13: Frontend — `list-venda.tsx`: "Gerar Nota Fiscal" for past sales

**Files:**
- Modify: `vendas-front/vendas-front/src/components/venda/list-venda.tsx`
- Test: `vendas-front/vendas-front/src/components/venda/list-venda.nfce.test.tsx`

**Interfaces:**
- Consumes: `NfceService.emitir(vendaId: string)` (Task 10).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VendaList from "./list-venda";
import VendaService from "../../services/venda.service";
import NfceService from "../../services/nfce.service";

jest.mock("../../services/venda.service");
jest.mock("../../services/nfce.service");

const venda = {
  uid: "v1", caixa: "c1", cliente: "Maria", itens: [],
  valorDesconto: 0, valorTotal: 10, valorPago: 10, valorTroco: 0,
  formaPagamento: "Dinheiro", create: "2026-07-13T10:00:00",
  nfceStatus: null,
};

beforeEach(() => {
  (VendaService.filterList as jest.Mock).mockResolvedValue({ data: [venda] });
});

test("emits an NFC-e for a past sale and shows the DANFE link on success", async () => {
  render(<VendaList />);
  await waitFor(() => expect(VendaService.filterList).toHaveBeenCalled());

  fireEvent.click(screen.getByText("Dinheiro"));

  (NfceService.emitir as jest.Mock).mockResolvedValue({
    data: { ...venda, nfceStatus: "autorizada", nfceChaveAcesso: "chave-1", nfceDanfeUrl: "https://x/danfe" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Gerar Nota Fiscal" }));

  await waitFor(() => expect(screen.getByRole("link", { name: /Ver Nota Fiscal/ })).toBeInTheDocument());
  expect(NfceService.emitir).toHaveBeenCalledWith("v1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendas-front/vendas-front && npx react-scripts test src/components/venda/list-venda.nfce.test.tsx --watchAll=false`
Expected: FAIL — no "Gerar Nota Fiscal" button in the DOM.

- [ ] **Step 3: Import `NfceService` and `Alert`**

At the top of `list-venda.tsx`, after `import VendaService from "../../services/venda.service";` (line 4):

```js
import NfceService from "../../services/nfce.service";
```

Extend the MUI import (line 11) to add `Alert`:

```js
import { ChangeEvent, Component } from "react";
```
stays as-is; the MUI import line becomes:

```js
import { InputAdornment, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, Alert } from "@mui/material";
```

- [ ] **Step 4: Add `nfceLoading` to `State` and bind the new handler**

Extend `State` (`list-venda.tsx:17-29`):

```ts
type State = {
  vendas: Array<VendaDTO>,
  start: Dayjs | null,
  end: Dayjs | null,
  valorSunTotal: number,
  valorSunPago: number,
  valorSunTroco: number,
  valorPIXTotal: number,
  valorDinheiroTotal: number,
  valorDebitoTotal: number,
  valorCreditoTotal: number,
  currentVenda: VendaDTO | null,
  nfceLoading: boolean,
};
```

In the constructor, after `this.onChangeValorPago = this.onChangeValorPago.bind(this);` (line 41):

```js
    this.gerarNotaFiscal = this.gerarNotaFiscal.bind(this);
```

In `this.state = {...}`, after `valorCreditoTotal: 0,` (line 54):

```js
      nfceLoading: false,
```

- [ ] **Step 5: Add the `gerarNotaFiscal` method**

After `setActiveVenda` (`list-venda.tsx:166-170`):

```js
  gerarNotaFiscal() {
    if (!this.state.currentVenda || !this.state.currentVenda.uid) {
      return;
    }
    const uid = this.state.currentVenda.uid;
    this.setState({ nfceLoading: true });
    NfceService.emitir(uid)
      .then((response: any) => {
        this.setState({
          nfceLoading: false,
          currentVenda: response.data,
        });
      })
      .catch((e: Error) => {
        const venda = this.state.currentVenda;
        if (venda) {
          venda.nfceStatus = "erro";
          venda.nfceMotivoErro = "Falha ao comunicar com o servidor";
        }
        this.setState({
          nfceLoading: false,
          currentVenda: venda,
        });
      });
  }
```

- [ ] **Step 6: Destructure `nfceLoading` in `render()`**

Replace the destructuring (`list-venda.tsx:172-185`) to add `nfceLoading` to the list:

```js
    const {
      vendas,
      start,
      end,
      valorSunTotal,
      valorSunPago,
      valorSunTroco,
      currentVenda,
      valorCreditoTotal,
      valorDebitoTotal,
      valorDinheiroTotal,
      valorPIXTotal,
      nfceLoading,
    } = this.state;
```

- [ ] **Step 7: Render the button below Remover/Atualizar**

After the `Grid container` holding "Remover"/"Atualizar" (`list-venda.tsx:315-326`, closes right before `</Grid>` at line 327), add:

```jsx
              <Grid item xs={12} sx={{ mt: 1 }}>
                {currentVenda.nfceStatus === "autorizada" ? (
                  <Button variant="outlined" color="success" fullWidth
                    href={currentVenda.nfceDanfeUrl || undefined} target="_blank" rel="noopener noreferrer">
                    Ver Nota Fiscal ({currentVenda.nfceChaveAcesso})
                  </Button>
                ) : (
                  <Button variant="contained" color="primary" fullWidth onClick={this.gerarNotaFiscal} disabled={nfceLoading}>
                    {nfceLoading ? "Emitindo..." : (currentVenda.nfceStatus === "rejeitada" || currentVenda.nfceStatus === "erro") ? "Tentar Novamente" : "Gerar Nota Fiscal"}
                  </Button>
                )}
                {(currentVenda.nfceStatus === "rejeitada" || currentVenda.nfceStatus === "erro") && currentVenda.nfceMotivoErro && (
                  <Alert severity="error" sx={{ mt: 1 }}>{currentVenda.nfceMotivoErro}</Alert>
                )}
              </Grid>
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd vendas-front/vendas-front && npx react-scripts test src/components/venda/list-venda.nfce.test.tsx --watchAll=false`
Expected: PASS

- [ ] **Step 9: Run the full frontend test suite**

Run: `cd vendas-front/vendas-front && npx react-scripts test --watchAll=false`
Expected: all tests pass (existing `AppShell`/`PageHeader`/`theme` tests + the new ones from Tasks 10, 12, 13).

- [ ] **Step 10: Manually verify in the browser**

Run: `cd vendas-front/vendas-front && npm start`, open `/list_venda`, click a past sale row, confirm "Gerar Nota Fiscal" appears in the detail panel.

- [ ] **Step 11: Commit**

```bash
cd vendas-front/vendas-front
git add src/components/venda/list-venda.tsx src/components/venda/list-venda.nfce.test.tsx
git commit -m "feat: allow emitting NFC-e retroactively from the sales list"
```

---

## After all tasks are done

The code path works end-to-end against `focusnfe.ambiente=homologacao`, but **will not produce a legally valid NFC-e** until:
1. A real Focus NFe account exists and `FOCUSNFE_TOKEN` is set.
2. The certificado digital is uploaded to that Focus NFe account.
3. `focusnfe.cnpj.emitente` and `focusnfe.ambiente=producao` are confirmed for production use, and the MEI Inscrição Estadual question is resolved with an accountant (see the spec's "Pré-requisitos fora do código").
