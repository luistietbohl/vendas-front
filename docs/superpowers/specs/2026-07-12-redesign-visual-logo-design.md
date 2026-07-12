# Redesign visual completo — paleta do logo Bom Cream

Data: 2026-07-12
Status: aprovado, pronto para plano de implementação

## Contexto

O frontend (`vendas-front/vendas-front`, React 17 + TS, react-scripts 4) usa hoje
Bootstrap + MUI + styled-components misturados, componentes de classe, e um
`App.css` genérico com cores azul/rosa arbitrárias que não têm relação com a
identidade visual real da loja. O logo da Sorveteria Bom Cream (anexado pelo
usuário) tem uma composição de duas cores muito clara: uma faixa rosa no topo
com o selo branco arredondado contendo o wordmark script "BomCream" em navy, e
uma faixa navy sólida embaixo com "Sempre com Você" em branco.

Este documento é a spec para um redesign visual completo do app inteiro
baseado nessa paleta e composição, mantendo toda a lógica/funcionalidade
existente intacta (é um reskin, não uma reescrita de comportamento).

## Escopo

- **Tipo**: novo sistema visual completo (paleta, tipografia, componentes
  reestilizados) aplicado de forma consistente em todas as páginas: login,
  venda (PDV), lista de vendas, produto, categoria, funcionário, caixa.
- **Página prioritária/vitrine**: tela de Venda (PDV) — é a tela operacional
  usada o tempo todo no balcão.
- **Fora de escopo**: reestruturação de UX/fluxos, mudança de lógica de
  negócio, novos recursos funcionais.
- **Dispositivos**: precisa funcionar bem tanto em desktop/tablet no balcão
  quanto em celular — responsividade real, não só "não quebrar".

## Stack visual

Consolidar em **MUI** com um `ThemeProvider` customizado. Remover a
dependência do Bootstrap nas telas e o CSS legado espalhado em `App.css`
(classes como `custom-botao-dentro`, `autocomplite-color`, etc.). Um único
tema (`src/theme.ts`) passa a governar cor, tipografia e overrides de
componente (`Button`, `AppBar`/`Drawer`, `Table`/`DataGrid`, `TextField`,
`Card`, `Dialog`).

## Paleta (tokens)

| Token | Hex | Uso |
|---|---|---|
| `navy` | `#0E4F82` | cor primária — texto de marca, ícones ativos, botão primário |
| `navy-deep` | `#0A3A61` | sidebar, hover/active, texto sobre rosa |
| `pink` | `#F0A8CE` | faixa "arco" de cabeçalho, botão secundário, badges |
| `pink-soft` | `#F6C2E0` | tints, hover leve, bordas suaves |
| `cream` | `#FFFBF6` | fundo geral do app (substitui o branco puro) |
| `white` | `#FFFFFF` | cards, superfícies |

Texto: `navy-deep` para títulos e labels, cinza-neutro escuro para corpo de
texto sobre branco/creme, branco para texto sobre navy/rosa escuro.

## Tipografia

- **Display (script)** — `Pacifico` (Google Fonts): apenas para o wordmark
  "Bom Cream" na sidebar e no título da tela de login. Uso comedido — nunca em
  botões, tabelas, labels ou qualquer texto denso (prejudica leitura).
- **Corpo/UI** — `Nunito` (Google Fonts): todo o resto — tabelas, formulários,
  botões, menus, mensagens. Arredondada e amigável, mantendo legibilidade em
  telas densas de dados (listas de venda, tabelas de produto).
- Números/preços em tabelas: `Nunito` semibold com
  `font-variant-numeric: tabular-nums` — sem terceira família tipográfica.

## Layout (shell da aplicação)

Reproduz a composição do próprio logo (opção "Duotone", validada com o
usuário via mockup):

- **Sidebar navy fixa** à esquerda (desktop, ≥768px) contendo o wordmark
  script e os itens de navegação (Venda, Caixa, Lista de Vendas, Produtos,
  Categorias, Funcionários, Sair), condicionados ao mesmo controle de
  permissão (`showAdminBoard`/`showCaixaBoard`) que existe hoje em `App.tsx`.
- **Faixa rosa em arco** no topo de cada página — título da página (fonte
  script) + ação principal quando aplicável (ex.: "+ Nova Venda"), com cantos
  inferiores arredondados que ecoam o selo do logo.
- **Conteúdo em fundo creme**, cards brancos com `border-radius` generoso
  (~16px) e sombra suave.
- **Mobile (<768px)**: a sidebar navy vira um **drawer** — barra rosa fixa no
  topo com ícone de menu (☰) que abre a navegação navy sobre o conteúdo
  (confirmado com o usuário sobre a alternativa de barra inferior fixa).

## Componentes a criar/alterar

- `src/theme.ts` — tema MUI novo (paleta, tipografia, overrides).
- `src/components/shell/AppShell.tsx` — substitui a navbar inline hoje em
  `App.tsx`: sidebar navy + drawer mobile + área de conteúdo.
- `src/components/shell/PageHeader.tsx` — a faixa rosa em arco reutilizável
  (título + slot para ação principal), usada em todas as telas de
  lista/add/edit.
- Reskin de cada tela existente (login, add/edit/list de produto, categoria,
  funcionário, venda, caixa) para usar os componentes MUI temados e o
  `PageHeader`, removendo classes Bootstrap/CSS legado à medida que forem
  substituídas.
- Remoção de `App.css` (ou redução ao mínimo indispensável, ex. regras de
  impressão `@media print` que não têm equivalente em tema MUI) e da
  importação do Bootstrap.

## Elemento de assinatura

O **"arco em selo"** do logo (o badge branco arredondado atrás do
"BomCream") é o elemento recorrente do app: aparece no `PageHeader` de cada
tela, no card de login, e nos cabeçalhos de modal/dialog — a aplicação
inteira remete visualmente à etiqueta física da sorveteria.

## Verificação

Não há testes automatizados de UI hoje. A validação será visual/manual:
rodar `npm start` e revisar cada tela reestilizada no navegador em pelo menos
duas larguras (desktop ≥1280px e mobile ~390px), conferindo:
- cores/tipografia aplicadas de forma consistente;
- sidebar/drawer funcionando nos dois breakpoints;
- nenhuma regressão funcional (CRUD de produto/categoria/funcionário, fluxo
  de venda, caixa, login continuam operando como antes).

## Decisões já validadas com o usuário

- Escopo: redesign visual completo (não UX).
- Prioridade: tela de Venda (PDV).
- Stack: consolidar em MUI com tema customizado.
- Dispositivo: mobile real, não só desktop.
- Direção de layout: "Duotone" (sidebar navy + faixa rosa), fiel à composição
  do logo.
- Navegação mobile: drawer (☰), não barra inferior fixa.
