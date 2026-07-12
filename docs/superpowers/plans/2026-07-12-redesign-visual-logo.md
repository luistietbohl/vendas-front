# Redesign Visual (paleta do logo Bom Cream) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire `vendas-front/vendas-front` app (login, venda, caixa, produto, categoria, funcionário) with a single MUI-based design system derived from the Sorveteria Bom Cream logo (navy + pink duotone), replacing Bootstrap, while keeping every existing business behavior identical.

**Architecture:** One shared MUI `theme.ts` (palette/typography/component overrides) + two new shell components (`AppShell` = navy sidebar/mobile drawer, `PageHeader` = the pink "arco" banner) wrap the existing `Switch`/`Route` tree in `App.tsx`. Each page component then gets its `render()` method rewritten to use MUI `Grid`/`TextField`/`Button`/`Table` instead of Bootstrap classes and to open with a `PageHeader`. No state, props, service calls, or business logic change in any page — only what each `render()` returns.

**Tech Stack:** React 17 + TypeScript (react-scripts 4), MUI v5 (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`, `@mui/lab`), `@fontsource/nunito` + `@fontsource/pacifico` (new), `@testing-library/react` (already present, used for the new shell components).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-redesign-visual-logo-design.md` — read it before starting if anything below is ambiguous.
- Palette tokens (exact hex, from the spec): `navy #0E4F82`, `navy-deep #0A3A61`, `pink #F0A8CE`, `pink-soft #F6C2E0`, `cream #FFFBF6`, `white #FFFFFF`.
- Typography: `Pacifico` (script) ONLY for the "Bom Cream" wordmark in the sidebar and for `PageHeader` titles. `Nunito` for everything else (forms, tables, buttons, body text).
- Mobile breakpoint is 768px (the theme overrides MUI's default `md` breakpoint from 900 to 768 in Task 2 — `theme.breakpoints.down('md')` means "<768px" everywhere in this plan).
- This is a **reskin, not a rewrite**: every `onChange`/`onClick` handler, every service call, every piece of `state`, every prop name in the touched files stays byte-for-byte the same. Only JSX markup/className/imports for presentation change.
- All `toLocaleString('pt-br', ...)` number formatting must be preserved exactly as it is today — do not change decimal precision anywhere.
- No automated UI/visual tests exist in this repo today (confirmed: no `*.test.*` files under `src/`). Per the spec's own verification section, page-reskin tasks are verified **manually** in the browser (desktop ≥1280px and mobile ~390px widths) rather than with new automated tests — writing pixel/style assertions would be low-value churn. The three new shell components (`theme.ts`, `PageHeader`, `AppShell`) DO get real automated tests, because they contain new conditional logic (permission-gated nav items, drawer open/close) worth locking down.
- Remove the Bootstrap dependency (`bootstrap` package + its CSS import) entirely once no page references Bootstrap classes anymore (last task).
- Every task must leave `npm run build` and (where applicable) `npm test` passing before committing.

---

### Task 1: Add project fonts (Nunito + Pacifico)

**Files:**
- Modify: `package.json` (new dependencies)
- Modify: `src/index.tsx`

**Interfaces:**
- Produces: global font-faces `Nunito` (weights 400, 600, 700) and `Pacifico` (weight 400) available to any component via `fontFamily: "'Nunito', sans-serif"` / `fontFamily: "'Pacifico', cursive"`.

- [ ] **Step 1: Install the font packages**

Run:
```bash
npm install @fontsource/nunito @fontsource/pacifico --save
```
Expected: `package.json` gains `@fontsource/nunito` and `@fontsource/pacifico` under `dependencies`.

- [ ] **Step 2: Import the font weights used by the theme**

Modify `src/index.tsx` — add these lines directly under the existing `import './index.css';` line:

```tsx
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/pacifico/400.css';
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds (no output changes expected yet since nothing consumes the fonts).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/index.tsx
git commit -m "Add Nunito and Pacifico fonts via fontsource"
```

---

### Task 2: Create the MUI theme

**Files:**
- Create: `src/theme.ts`
- Test: `src/theme.test.ts`

**Interfaces:**
- Produces: `export const theme: Theme` (MUI theme object), `export const brandFont = "'Pacifico', cursive"` — both imported by `PageHeader` (Task 3), `AppShell` (Task 4), and `index.tsx` (Task 5).

- [ ] **Step 1: Write the failing test**

Create `src/theme.test.ts`:

```ts
import { theme } from './theme';

describe('theme', () => {
  it('uses the Bom Cream palette tokens', () => {
    expect(theme.palette.primary.main).toBe('#0E4F82');
    expect(theme.palette.primary.dark).toBe('#0A3A61');
    expect(theme.palette.secondary.main).toBe('#F0A8CE');
    expect(theme.palette.secondary.light).toBe('#F6C2E0');
    expect(theme.palette.background.default).toBe('#FFFBF6');
    expect(theme.palette.background.paper).toBe('#FFFFFF');
  });

  it('sets Nunito as the base font family', () => {
    expect(theme.typography.fontFamily).toContain('Nunito');
  });

  it('moves the md breakpoint to 768px for the mobile shell', () => {
    expect(theme.breakpoints.values.md).toBe(768);
  });

  it('gives buttons a pill shape and no uppercase transform', () => {
    const buttonRoot = (theme.components?.MuiButton?.styleOverrides as any)?.root;
    expect(buttonRoot.textTransform).toBe('none');
    expect(buttonRoot.borderRadius).toBe(999);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test src/theme.test.ts --watchAll=false`
Expected: FAIL with "Cannot find module './theme'"

- [ ] **Step 3: Write the theme**

Create `src/theme.ts`:

```ts
import { createTheme } from '@mui/material/styles';

export const brandFont = "'Pacifico', cursive";

export const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: '#0E4F82',
      dark: '#0A3A61',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F0A8CE',
      light: '#F6C2E0',
      contrastText: '#0A3A61',
    },
    background: {
      default: '#FFFBF6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0A3A61',
    },
  },
  typography: {
    fontFamily: "'Nunito', sans-serif",
    h5: {
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#0E4F82',
          color: '#FFFFFF',
          fontWeight: 700,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F6C2E0',
          },
        },
      },
    },
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test src/theme.test.ts --watchAll=false`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts src/theme.test.ts
git commit -m "Add MUI theme with Bom Cream palette and typography"
```

---

### Task 3: Create the `PageHeader` component (the "arco" signature element)

**Files:**
- Create: `src/components/shell/PageHeader.tsx`
- Test: `src/components/shell/PageHeader.test.tsx`

**Interfaces:**
- Consumes: `brandFont` from `src/theme.ts` (Task 2).
- Produces: `export default function PageHeader(props: { title: string; action?: React.ReactNode })` — a full-width pink banner with rounded bottom corners, script-font title on the left, optional action slot (e.g. a button) on the right. Used by every page task below as the first child of each page's returned JSX.

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/PageHeader.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('renders the page title', () => {
    render(<PageHeader title="Produtos" />);
    expect(screen.getByText('Produtos')).toBeInTheDocument();
  });

  it('renders an optional action slot', () => {
    render(<PageHeader title="Produtos" action={<button>Adicionar</button>} />);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('renders without an action slot', () => {
    render(<PageHeader title="Produtos" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test src/components/shell/PageHeader.test.tsx --watchAll=false`
Expected: FAIL with "Cannot find module './PageHeader'"

- [ ] **Step 3: Write the component**

Create `src/components/shell/PageHeader.tsx`:

```tsx
import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { brandFont } from "../../theme";

type Props = {
  title: string;
  action?: ReactNode;
};

export default function PageHeader({ title, action }: Props) {
  return (
    <Box
      sx={{
        bgcolor: "secondary.main",
        color: "primary.dark",
        px: { xs: 2, md: 4 },
        py: 2,
        mb: 3,
        borderRadius: "0 0 24px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Typography
        variant="h5"
        component="h1"
        sx={{ fontFamily: brandFont, fontWeight: 400 }}
      >
        {title}
      </Typography>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test src/components/shell/PageHeader.test.tsx --watchAll=false`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/PageHeader.tsx src/components/shell/PageHeader.test.tsx
git commit -m "Add PageHeader signature component"
```

---

### Task 4: Create the `AppShell` component (navy sidebar + mobile drawer)

**Files:**
- Create: `src/components/shell/AppShell.tsx`
- Test: `src/components/shell/AppShell.test.tsx`

**Interfaces:**
- Consumes: `brandFont` from `src/theme.ts` (Task 2).
- Produces: `export default function AppShell(props: { showAdminBoard: boolean; showCaixaBoard: boolean; currentUser: string | null; onLogout: () => void; children: React.ReactNode })`. Wraps `App.tsx`'s routed content (Task 5).

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/AppShell.test.tsx`:

```tsx
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './AppShell';

function renderShell(props: Partial<React.ComponentProps<typeof AppShell>> = {}) {
  return render(
    <BrowserRouter>
      <AppShell
        showAdminBoard={false}
        showCaixaBoard={false}
        currentUser="admin"
        onLogout={() => {}}
        {...props}
      >
        <div>conteudo</div>
      </AppShell>
    </BrowserRouter>
  );
}

describe('AppShell', () => {
  it('always shows Venda and Produtos for a logged-in user', () => {
    renderShell();
    expect(screen.getAllByText('Venda').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Produtos').length).toBeGreaterThan(0);
  });

  it('hides Caixa and Funcionários for a plain logged-in user', () => {
    renderShell({ showAdminBoard: false, showCaixaBoard: false });
    expect(screen.queryByText('Caixa')).not.toBeInTheDocument();
    expect(screen.queryByText('Funcionários')).not.toBeInTheDocument();
  });

  it('shows Caixa for the caixa board and Funcionários only for the admin board', () => {
    renderShell({ showAdminBoard: true, showCaixaBoard: false });
    expect(screen.getAllByText('Caixa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Funcionários').length).toBeGreaterThan(0);
  });

  it('renders no nav items when there is no current user', () => {
    renderShell({ currentUser: null });
    expect(screen.queryByText('Produtos')).not.toBeInTheDocument();
  });

  it('opens the mobile drawer from the hamburger button', () => {
    renderShell();
    const mobileNav = screen.getByLabelText('abrir menu');
    fireEvent.click(mobileNav);
    const dialog = screen.getByRole('presentation');
    expect(within(dialog).getByText('Venda')).toBeTruthy();
  });

  it('renders the page content passed as children', () => {
    renderShell();
    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test src/components/shell/AppShell.test.tsx --watchAll=false`
Expected: FAIL with "Cannot find module './AppShell'"

- [ ] **Step 3: Write the component**

Create `src/components/shell/AppShell.tsx`:

```tsx
import { useState, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { brandFont } from "../../theme";

const DRAWER_WIDTH = 240;

type NavItem = {
  label: string;
  to: string;
};

type Props = {
  showAdminBoard: boolean;
  showCaixaBoard: boolean;
  currentUser: string | null;
  onLogout: () => void;
  children: ReactNode;
};

export default function AppShell({
  showAdminBoard,
  showCaixaBoard,
  currentUser,
  onLogout,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down("md"));

  const navItems: NavItem[] = currentUser
    ? [
        { label: "Venda", to: "/add_venda" },
        ...(showAdminBoard || showCaixaBoard
          ? [
              { label: "Caixa", to: "/add_caixa" },
              { label: "Lista Vendas", to: "/list_vendas" },
            ]
          : []),
        { label: "Produtos", to: "/list_produto" },
        { label: "Categorias", to: "/list_categoria" },
        ...(showAdminBoard
          ? [{ label: "Funcionários", to: "/list_funcionario" }]
          : []),
      ]
    : [];

  const drawerContent = (
    <Box sx={{ bgcolor: "primary.dark", height: "100%", color: "white" }}>
      <Toolbar>
        <Typography sx={{ fontFamily: brandFont, fontSize: 22 }}>
          Bom Cream
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={Link}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            sx={{ color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListItemButton
          component="a"
          href="/"
          onClick={onLogout}
          sx={{ color: "secondary.light" }}
        >
          <ListItemText primary="Sair" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          display: { xs: "flex", md: "none" },
          bgcolor: "secondary.main",
          color: "primary.dark",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ color: "primary.dark", mr: 2 }}
            aria-label="abrir menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ fontFamily: brandFont }}>Bom Cream</Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          minHeight: "100vh",
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: 7, md: 0 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test src/components/shell/AppShell.test.tsx --watchAll=false`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/AppShell.tsx src/components/shell/AppShell.test.tsx
git commit -m "Add AppShell with navy sidebar and mobile drawer"
```

---

### Task 5: Wire the theme and AppShell into the app, remove Bootstrap from the shell

**Files:**
- Modify: `src/index.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `theme` (Task 2), `AppShell` (Task 4).
- Produces: every page component rendered inside `<Switch>` now sits inside `<AppShell>` and inside a `<Box sx={{ p: { xs: 2, md: 4 } }}>` content wrapper — later tasks assume this padding is already applied and do not repeat it.

- [ ] **Step 1: Wrap the app in `ThemeProvider` + `CssBaseline`**

Modify `src/index.tsx` to:

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import './index.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/pacifico/400.css';
import App from './App';
import { theme } from './theme';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>,
  document.getElementById('root')
);

reportWebVitals();
```

- [ ] **Step 2: Replace the inline Bootstrap navbar in `App.tsx` with `AppShell`**

Modify `src/App.tsx` — replace the top imports (remove the Bootstrap CSS import and `App.css` import, remove `Link` since it's no longer used directly here, add `Box` and `AppShell`):

```tsx
import { Component } from "react";
import { Switch, Route } from "react-router-dom";
import { Box } from "@mui/material";

import AppShell from "./components/shell/AppShell";
import AddProduto from "./components/produto/add-produto";
import ProdutoList from "./components/produto/list-produto";
import EditProduto from "./components/produto/edit-produto";
import AddVenda from "./components/venda/add-venda";
import VendaList from "./components/venda/list-venda";
import AddCaixa from "./components/caixa/add-caixa";
import AddCategoria from "./components/categoria/add-categoria";
import CategoriaList from "./components/categoria/list-categoria";
import EditCategoria from "./components/categoria/edit-categoria";
import AddFuncionario from "./components/funcionario/add-funcionario";
import FuncionarioList from "./components/funcionario/list-funcionario";
import EditFuncionario from "./components/funcionario/edit-funcionario";

import authService from "./auth/auth.service";
import Login from "./components/login/login";
```

Replace the `render()` method body (everything stays the same above `render()` — constructor, `componentDidMount`, `componentWillUnmount`, `logOut` are unchanged) with:

```tsx
  render() {
    const { currentUser, showAdminBoard, showCaixaBoard } = this.state;
    return (
      <AppShell
        currentUser={currentUser}
        showAdminBoard={showAdminBoard}
        showCaixaBoard={showCaixaBoard}
        onLogout={this.logOut}
      >
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Switch>
            <Route exact path={["/", "/login"]} component={Login} />
            <Route exact path="/add_venda" component={AddVenda} />
            <Route exact path="/add_caixa" component={AddCaixa} />
            <Route exact path="/list_vendas" component={VendaList} />
            <Route exact path="/add_produto" component={AddProduto} />
            <Route exact path="/list_produto" component={ProdutoList} />
            <Route path="/list_produto/:id" component={EditProduto} />
            <Route exact path="/add_categoria" component={AddCategoria} />
            <Route exact path="/list_categoria" component={CategoriaList} />
            <Route path="/list_categoria/:id" component={EditCategoria} />
            <Route exact path="/add_funcionario" component={AddFuncionario} />
            <Route exact path="/list_funcionario" component={FuncionarioList} />
            <Route path="/list_funcionario/:id" component={EditFuncionario} />
          </Switch>
        </Box>
      </AppShell>
    );
  }
}

export default App;
```

- [ ] **Step 3: Trim `App.css` to only the print rules it still needs**

Replace the entire contents of `src/App.css` with:

```css
.printme {
  width: 100%;
  display: none;
  font-size: 40px;
}

@media print {
  .no-printme { display: none; }
  .printme { display: block; }
}
```

(This drops the background-logo watermark and every Bootstrap-era utility class — `add-venda.tsx` in Task 7 is the only remaining consumer of `.printme`/`.no-printme`, and it keeps using them unchanged.)

- [ ] **Step 4: Verify the app still builds and starts**

Run: `npm run build`
Expected: build succeeds. Then run `npm start` and open `http://localhost:3000` — you should see the navy sidebar (desktop) with only "Sair" in it (not logged in yet), Login renders inside the cream content area. Resize the window below 768px — the sidebar should disappear and a pink top bar with a ☰ icon should appear; clicking it opens the navy drawer over the content.

- [ ] **Step 5: Commit**

```bash
git add src/index.tsx src/App.tsx src/App.css
git commit -m "Wire theme and AppShell into the application root"
```

---

### Task 6: Reskin the Login page

**Files:**
- Modify: `src/components/login/login.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3), `brandFont` (Task 2). No change to `authService` usage or component state.

- [ ] **Step 1: Replace imports and `render()`**

Modify `src/components/login/login.tsx` — add MUI imports under the existing imports:

```tsx
import { ChangeEvent, Component } from "react";
import authService from "../../auth/auth.service";
import logo from "../../logo_bomcream.png";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { brandFont } from "../../theme";
```

Replace the `render()` method with:

```tsx
    render() {
        const { currentUser, login, pass } = this.state;
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 2, md: 6 } }}>
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        maxWidth: 380,
                        width: "100%",
                        borderRadius: "32px",
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ fontFamily: brandFont, fontSize: 32, color: "primary.dark", mb: 1 }}>
                        Bom Cream
                    </Typography>
                    <Typography sx={{ mb: 3 }}>Sistema de vendas</Typography>
                    {currentUser ? (
                        <Box>
                            <img src={logo} alt={"logo"} style={{ width: '80%' }} />
                            <Typography variant="h6" sx={{ mt: 2 }}>Serviço de vendas!</Typography>
                        </Box>
                    ) : (
                        <Box
                            component="form"
                            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                            onKeyPress={this.onPressEnter}
                        >
                            <TextField
                                id="login"
                                name="login"
                                label="Login"
                                required
                                value={login}
                                onChange={this.onChangeLogin}
                            />
                            <TextField
                                id="pass"
                                name="pass"
                                label="Senha"
                                type="password"
                                required
                                value={pass}
                                onChange={this.onChangePass}
                            />
                            <Button variant="contained" color="primary" onClick={this.login}>
                                Login
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>
        )
    }
}

export default Login;
```

- [ ] **Step 2: Manual verification**

Run `npm start`, open `/login`. Confirm: script "Bom Cream" title, rounded card, both fields work, Enter key still submits (via `onPressEnter`), successful login still shows the logo + "Serviço de vendas!" state. Check the same at a 390px-wide viewport.

- [ ] **Step 3: Commit**

```bash
git add src/components/login/login.tsx
git commit -m "Reskin login page with the Bom Cream theme"
```

---

### Task 7: Reskin the Venda pages (priority page — PDV)

**Files:**
- Modify: `src/components/venda/add-venda.tsx`
- Modify: `src/components/venda/list-venda.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3). No change to any state field, service call, or handler in either file — only `render()` changes.

- [ ] **Step 1: Replace `render()` in `add-venda.tsx`**

Add these imports to the top of `src/components/venda/add-venda.tsx` (keep every existing import):

```tsx
import { Grid, Paper, Button, List, ListItem, ListItemText, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method (everything above `render()` is unchanged) with:

```tsx
    render() {
        const { produtos, currentItem, itens, valorTotal, formaPagamento, cliente, caixa, openModel,
            valorPago, valorTroco, produtoID, produtoNome, categorias, open, msg, vendasEmAberto } = this.state;

        return (
            <div>
                <PageHeader title="Nova Venda" />
                <FormControl fullWidth>
                    <Collapse in={open} addEndListener={this.finalizaAlert}>
                        <Alert severity={msg === "Venda registrada com sucesso!" ? "success" : "error"}
                            color={msg === "Venda registrada com sucesso!" ? "success" : "error"}>
                            {msg}
                        </Alert>
                    </Collapse>
                    {caixa ? (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6} className="no-printme">
                                <Grid container spacing={2}>
                                    {categorias.map((categoria) => {
                                        if (categoria.tipo === "visivel") {
                                            return (
                                                <Grid item xs={6} md={4} key={categoria.uid} sx={{ textAlign: "center" }}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.dark" }}>{categoria.nome}</Typography>
                                                    <ToggleButtonGroup
                                                        color="primary"
                                                        orientation="vertical"
                                                        value={produtoID}
                                                        exclusive
                                                        onChange={this.handleChangeProduto}
                                                        aria-label="Platform"
                                                        sx={{ width: "100%", mb: 2 }}
                                                    >
                                                        {produtos &&
                                                            produtos.filter(prod => prod.categoria === categoria.uid)
                                                                .sort((n1, n2) => {
                                                                    if (n1.valor > n2.valor) {
                                                                        return 1;
                                                                    }

                                                                    if (n1.valor < n2.valor) {
                                                                        return -1;
                                                                    }

                                                                    return 0;
                                                                })
                                                                .map((produto, index) => (
                                                                    <ToggleButton value={produto.uid} key={index}>{produto.nome}</ToggleButton>
                                                                ))}
                                                    </ToggleButtonGroup>
                                                </Grid>
                                            )
                                        } else {
                                            return (
                                                <Grid item xs={6} md={4} key={categoria.uid} sx={{ textAlign: "center" }}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.dark" }}>{categoria.nome}</Typography>
                                                    <Autocomplete
                                                        disablePortal
                                                        id="combo-box-demo"
                                                        value={produtoNome}
                                                        onChange={this.handleChangeProdutoOculto}
                                                        options={produtos.filter(prod => prod.categoria === categoria.uid)
                                                            .map((produto) => { return produto.nome })}
                                                        renderInput={(params) => (<TextField {...params} label={categoria.nome} />)}
                                                    />
                                                </Grid>
                                            )
                                        }
                                    }
                                    )}
                                </Grid>
                                {currentItem ? (
                                    <Modal
                                        open={openModel}
                                        onClose={this.handleClose}
                                        aria-labelledby="modal-modal-title"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        aria-describedby="modal-modal-description">
                                        <Paper sx={{ p: 3, maxWidth: 360, width: "90%" }}>
                                            <Typography variant="h6">Produto: <strong>{currentItem.produto.nome}</strong></Typography>
                                            <Box sx={{ mt: 2 }}>
                                                {!(currentItem.produto.tipoMedida === "Aleatorio") && (
                                                    <div>
                                                        <label>
                                                            <strong>Valor:</strong>
                                                        </label>{" R$ "}
                                                        {currentItem.produto.valor.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                                {currentItem.produto.tipoMedida === "Unidade" && (
                                                    <div>
                                                        <TextField id="quantidade" label="Quantidade" variant="outlined"
                                                            type="number"
                                                            value={currentItem.quantidade}
                                                            onChange={this.onChangeQuantidade}
                                                            onKeyPress={this.onPressEnterItem}
                                                            autoFocus
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">Un</InputAdornment>,
                                                            }}
                                                            required
                                                            helperText="Quantidade deve ser maior ou igual a 1"
                                                        />
                                                    </div>
                                                )}
                                                {currentItem.produto.tipoMedida === "Kilograma" && (
                                                    <div>
                                                        <TextField id="quantidade" label="Quantidade" variant="outlined"
                                                            type="number"
                                                            value={currentItem.quantidade}
                                                            onChange={this.onChangeQuantidade}
                                                            onKeyPress={this.onPressEnterItem}
                                                            autoFocus
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">Kg</InputAdornment>,
                                                            }}
                                                            helperText="Quantidade deve ser maior que zero"
                                                        />
                                                    </div>
                                                )}
                                                {currentItem.produto.tipoMedida === "Aleatorio" && (
                                                    <div>
                                                        <TextField id="valor" label="Valor" variant="outlined"
                                                            type="number"
                                                            value={currentItem.valorItem}
                                                            onChange={this.onChangeValorItem}
                                                            onKeyPress={this.onPressEnterItem}
                                                            autoFocus
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                                            }}
                                                            helperText="Valor deve ser maior que zero"
                                                        />
                                                    </div>
                                                )}
                                                {!(currentItem.produto.tipoMedida === "Aleatorio") && (
                                                    <div>
                                                        <label>
                                                            <strong>Valor do item:</strong>
                                                        </label><strong>{" R$ "}
                                                            {currentItem.valorItem.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                    </div>
                                                )}
                                            </Box>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                sx={{ mt: 3 }}
                                                onClick={this.adicionarItem}
                                            >
                                                Adicionar Item
                                            </Button>
                                        </Paper>
                                    </Modal>
                                ) : null}
                            </Grid>
                            {itens.length > 0 ? (
                                <Grid item xs={12} md={6} className="no-printme">
                                    <Typography variant="h6" sx={{ textAlign: "center" }}>Carrinho de compras</Typography>
                                    <List component={Paper}>
                                        {itens.map((item, index) => (
                                            <ListItem key={index} secondaryAction={<DeleteIcon onClick={() => this.removeItem(index, item)} sx={{ cursor: "pointer" }} />}>
                                                <ListItemText
                                                    primary={item.produto.nome}
                                                    secondary={`Un: R$ ${item.produto.valor.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Qtd: ${item.quantidade.toLocaleString('pt-br', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} · Total: R$ ${item.valorItem.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                    <Typography sx={{ mt: 1 }}>
                                        <strong>Valor Total da compra: R$ {valorTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </Typography>
                                    <Grid container spacing={2} sx={{ pt: 3 }}>
                                        <Grid item xs={12} md={4}>
                                            <InputLabel id="formaPagamento-select-label">Forma de pagamento</InputLabel>
                                            <Select
                                                labelId="formaPagamento-select-label"
                                                id="formaPagamento"
                                                value={formaPagamento}
                                                fullWidth
                                                label="Forma de pagamento"
                                                onChange={this.onChangeFormaPagamento}
                                                required
                                            >
                                                <MenuItem value={"Dinheiro"}> Dinheiro </MenuItem>
                                                <MenuItem value={"Debito"}> Debito </MenuItem>
                                                <MenuItem value={"Credito"}> Credito </MenuItem>
                                                <MenuItem value={"PIX"}> PIX </MenuItem>
                                            </Select>
                                        </Grid>
                                        {formaPagamento === "Dinheiro" ? (
                                            <Grid item xs={12} md={5}>
                                                <TextField id="valorPago" label="Valor Pago" variant="outlined"
                                                    type="number"
                                                    value={valorPago}
                                                    onChange={this.onChangeValorPago}
                                                    onKeyPress={this.onPressEnterPago}
                                                    autoFocus
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                                    }}
                                                    required
                                                    helperText="Valor Pago deve ser maior que zero"
                                                />
                                            </Grid>
                                        ) : (
                                            <Grid item xs={12} md={5}>
                                                <Typography><strong>Valor Pago: R$ {valorPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                            </Grid>
                                        )}
                                        <Grid item xs={12} md={3}>
                                            <Typography><strong>Troco: R$ {valorTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                        </Grid>
                                    </Grid>
                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid item xs={12} md={4}>
                                            <TextField id="valorPago" label="Cliente" variant="outlined"
                                                type="text"
                                                fullWidth
                                                value={cliente}
                                                onChange={this.onChangeCliente}
                                            />
                                        </Grid>
                                        <Grid item xs={4} md={4}>
                                            <Button onClick={this.pagamentoPendente} variant="outlined" color="secondary" fullWidth>
                                                Pagamento pendente
                                            </Button>
                                        </Grid>
                                        <Grid item xs={4} md={2}>
                                            <Button onClick={this.finalizarVenda} variant="contained" color="primary" fullWidth>
                                                Finalizar Compra
                                            </Button>
                                        </Grid>
                                        <Grid item xs={4} md={2}>
                                            <Button onClick={this.imprimir} variant="contained" color="primary" fullWidth>
                                                Imprimir
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            ) : (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" sx={{ textAlign: "center" }}>Carrinho de compras</Typography>
                                    <List component={Paper}>
                                        <ListItem>
                                            <ListItemText primary="Sem itens adicionados" />
                                        </ListItem>
                                    </List>
                                </Grid>
                            )}
                            <div className="printme">
                                <img src={logo} alt={"logo"} style={{ width: '100%' }} />
                                <h1 className="titulo-central" style={{ fontSize: 'xxx-large', fontWeight: '600' }}>Compras</h1>
                                <ul className="list-group">
                                    <li className="list-group-item">
                                        <div className="row">
                                            <div className="col-5"><strong>Produto</strong></div>
                                            <div className="col-3 custom-div-valor"><strong>Valor item</strong></div>
                                            <div className="col-1 custom-div-center"><strong>Quant</strong></div>
                                            <div className="col-3 custom-div-valor"><strong>Total</strong></div>
                                        </div>
                                    </li>
                                    {itens.map((item, index) => (
                                        <li className="list-group-item" key={index}>
                                            <div className="row">
                                                <div className="col-5">{item.produto.nome}</div>
                                                <div className="col-3 custom-div-valor">R$ {item.produto.valor.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                <div className="col-1 custom-div-center">{item.quantidade.toLocaleString('pt-br', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                                                <div className="col-3 custom-div-valor">R$ {item.valorItem.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-1">
                                    <label>
                                        <strong>Valor Total da compra:</strong>
                                    </label><strong>{" R$ "}
                                        {valorTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </div>
                                <div className="mt-1" style={{ textAlign: 'center' }}>
                                    <label>{new Date().toLocaleString()}</label>
                                </div>
                            </div>
                            {vendasEmAberto.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="h6" sx={{ textAlign: "center" }}>Pagamentos Pendentes</Typography>
                                    <List component={Paper}>
                                        {vendasEmAberto.map((venda, index) => (
                                            <ListItem
                                                button
                                                onClick={() => this.setActiveVenda(venda, index)}
                                                key={index}
                                            >
                                                <ListItemText
                                                    primary={venda.cliente}
                                                    secondary={`Itens: ${venda.itens.length.toLocaleString('pt-br', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} · Total: R$ ${venda.valorTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Pago: R$ ${venda.valorPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>
                            )}
                        </Grid>
                    ) : (
                        <Typography sx={{ p: 2 }}>
                            Necessário abrir o caixa para efetuar vendas!
                        </Typography>
                    )}

                </FormControl>
            </div>
        )
    }
}
```

- [ ] **Step 2: Replace `render()` in `list-venda.tsx`**

Add this import to the top of `src/components/venda/list-venda.tsx`:

```tsx
import PageHeader from "../shell/PageHeader";
import { Grid, Typography } from "@mui/material";
```

Replace the `render()` method with:

```tsx
  render() {
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
    } = this.state;

    return (
      <div>
        <PageHeader title="Lista de Vendas" />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
              <DateTimePicker
                label="Data de inicio"
                value={start}
                onChange={(newValue) => this.onChangeStart(newValue)}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
              <DateTimePicker
                label="Data de termino"
                value={end}
                onChange={(newValue) => this.onChangeEnd(newValue)}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableHead>
                  <TableRow>
                    <TableCell>Data da venda</TableCell>
                    <TableCell align="right">Itens</TableCell>
                    <TableCell>Forma de pagamento</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell align="right">Valor Pago</TableCell>
                    <TableCell align="right">Valor Troco</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendas.map((venda) => (
                    <TableRow
                      onClick={() => this.setActiveVenda(venda)}
                      key={venda.uid}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: "pointer" }}
                    >
                      <TableCell component="th" scope="row">
                        {new Date(venda.create).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{venda.itens.length}</TableCell>
                      <TableCell>{venda.formaPagamento}</TableCell>
                      <TableCell align="right">{venda.valorTotal ?
                        'R$ ' + venda.valorTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                      <TableCell align="right">{venda.valorPago ?
                        'R$ ' + venda.valorPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                      <TableCell align="right">{venda.valorTroco ?
                        'R$ ' + venda.valorTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          {currentVenda ? (
            <Grid item xs={12} md={5}>
              <Typography variant="h6">Venda</Typography>
              <Typography>ID: {currentVenda.uid}</Typography>
              <Typography>Cliente: {currentVenda.cliente}</Typography>
              <Typography>Data: {new Date(currentVenda.create).toLocaleString()}</Typography>
              <Typography sx={{ mb: 1 }}>Itens: {currentVenda.itens.length}</Typography>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 350 }} size="small" aria-label="a dense table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell>Valor unitario</TableCell>
                      <TableCell>Quantidade</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentVenda.itens.map((item, index) => (
                      <TableRow
                        key={index}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>{item.produto.nome}</TableCell>
                        <TableCell>{item.produto.categoria}</TableCell>
                        <TableCell>R$ {item.produto.valor.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>R$ {item.valorItem.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <InputLabel id="formaPagamento-select-label" sx={{ mt: 2 }}>Forma de pagamento</InputLabel>
              <Select
                labelId="formaPagamento-select-label"
                id="formaPagamento"
                value={currentVenda.formaPagamento}
                fullWidth
                label="Forma de pagamento"
                onChange={this.onChangeFormaPagamento}
              >
                <MenuItem value={"Dinheiro"}> Dinheiro </MenuItem>
                <MenuItem value={"Debito"}> Debito </MenuItem>
                <MenuItem value={"Credito"}> Credito </MenuItem>
                <MenuItem value={"PIX"}> PIX </MenuItem>
              </Select>

              <Typography sx={{ mt: 2 }}>Total: {currentVenda.valorTotal ?
                'R$ ' + currentVenda.valorTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</Typography>

              <TextField id="valorPago" label="Valor Pago" variant="outlined"
                type="number"
                fullWidth
                sx={{ mt: 2 }}
                value={currentVenda.valorPago}
                onChange={this.onChangeValorPago}
                autoFocus
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                required
                helperText="Valor Pago deve ser maior que zero"
              />
              <Typography sx={{ mt: 2 }}>Troco: {currentVenda.valorTroco ?
                'R$ ' + currentVenda.valorTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</Typography>

              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Button variant="outlined" color="error" fullWidth onClick={this.deleteVenda}>
                    Remover
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button type="submit" variant="contained" color="primary" fullWidth onClick={this.updateVenda}>
                    Atualizar
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          ) : null}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography><strong>Total valor Vendas: R$ {valorSunTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography><strong>Total valor pago: R$ {valorSunPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography><strong>Total valor troco: R$ {valorSunTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography><strong>Total PIX: R$ {valorPIXTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography><strong>Total Debito: R$ {valorDebitoTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography><strong>Total Credito: R$ {valorCreditoTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography><strong>Total Dinheiro: R$ {valorDinheiroTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </div>
    )
  }
}
```

Also add `Button` to the existing `@mui/material` import line in this file (it currently imports `InputAdornment, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField` — append `, Button` to that list).

- [ ] **Step 3: Manual verification**

Run `npm start`. With a caixa open, go through: adding items from both toggle-button and autocomplete categories, the quantity/value modal, removing an item, switching forma de pagamento, finalizing a sale, pagamento pendente, and Imprimir (print view should be unaffected — it still uses the untouched `.printme` block). Then check `/list_vendas`: date filters, row click populates the detail panel, delete/update buttons. Verify both at desktop and ~390px width.

- [ ] **Step 4: Commit**

```bash
git add src/components/venda/add-venda.tsx src/components/venda/list-venda.tsx
git commit -m "Reskin venda (PDV) pages with the Bom Cream theme"
```

---

### Task 8: Reskin the Caixa page

**Files:**
- Modify: `src/components/caixa/add-caixa.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3). No change to state or handlers.

- [ ] **Step 1: Replace `render()`**

Add to the top of `src/components/caixa/add-caixa.tsx`:

```tsx
import { Grid, Button, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
    render() {
        const { uid, user, start, end, valorCaixaAnterior, vendas, lancamentos,
            valorLancamento, descricaoLancamento, tipoLancamento, userLancamento,
            valorSunTotal, valorSunPago, openLancamentoSucess,
            valorSunTroco, valorDebitoCreditoTotal,
            valorTotalCaixa, valorDinheiroTotal,
            valorPIXTotal, } = this.state;

        return (
            <div>
                <PageHeader title="Caixa" />
                <FormControl fullWidth>
                    <Collapse in={openLancamentoSucess} addEndListener={this.finalizaAlert}>
                        <Alert severity="success" color="success">
                            Lançamento registrado com sucesso!
                        </Alert>
                    </Collapse>
                    {uid ? (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ textAlign: "center" }}>Lançamentos no Caixa</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField id="descricaoLancamento" label="Descrição" variant="outlined"
                                    type="text"
                                    fullWidth
                                    value={descricaoLancamento}
                                    onChange={this.onChangeDescricaoLancamento}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField id="userLancamento" label="Usuário" variant="outlined"
                                    type="text"
                                    fullWidth
                                    value={userLancamento}
                                    onChange={this.onChangeUserLancamento}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <InputLabel id="formaPagamento-select-label">Tipo de Lançamento</InputLabel>
                                <Select
                                    labelId="formaPagamento-select-label"
                                    id="formaPagamento"
                                    value={tipoLancamento}
                                    fullWidth
                                    label="Tipo de Lançamento"
                                    onChange={this.onChangeTipoLancamento}
                                >
                                    <MenuItem value={"Credito"}>Adicionar</MenuItem>
                                    <MenuItem value={"Debito"}>Retirar</MenuItem>
                                </Select>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField id="valor" label="Valor" variant="outlined"
                                    type="number"
                                    fullWidth
                                    value={valorLancamento}
                                    onChange={this.onChangeValorLancamento}
                                    autoFocus
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Button onClick={this.adicionarLancamento} variant="contained" color="primary" sx={{ mt: 1 }} fullWidth>
                                    Adicionar Lançamento
                                </Button>
                            </Grid>

                            <Grid item xs={12} md={7}>
                                <Typography variant="h6" sx={{ textAlign: "center" }}>Vendas efetuadas</Typography>
                                <TableContainer component={Paper}>
                                    <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Data da venda</TableCell>
                                                <TableCell align="right">Itens</TableCell>
                                                <TableCell>Forma de pagamento</TableCell>
                                                <TableCell align="right">Valor Total</TableCell>
                                                <TableCell align="right">Valor Pago</TableCell>
                                                <TableCell align="right">Valor Troco</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {vendas.map((venda) => (
                                                <TableRow
                                                    key={venda.uid}
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
                                                    <TableCell component="th" scope="row">
                                                        {new Date(venda.create).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="right">{venda.itens.length}</TableCell>
                                                    <TableCell>{venda.formaPagamento}</TableCell>
                                                    <TableCell align="right">{venda.valorTotal ?
                                                        'R$ ' + venda.valorTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                                                    <TableCell align="right">{venda.valorPago ?
                                                        'R$ ' + venda.valorPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                                                    <TableCell align="right">{venda.valorTroco ?
                                                        'R$ ' + venda.valorTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                            <Grid item xs={12} md={5}>
                                <Typography variant="h6" sx={{ textAlign: "center" }}>Lançamentos efetuadas</Typography>
                                <TableContainer component={Paper}>
                                    <Table sx={{ minWidth: 350 }} size="small" aria-label="a dense table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Data do lançamento</TableCell>
                                                <TableCell>Descrição</TableCell>
                                                <TableCell>Tipo</TableCell>
                                                <TableCell align="right">Valor</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lancamentos.map((lancamento) => (
                                                <TableRow
                                                    key={lancamento.uid}
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
                                                    <TableCell component="th" scope="row">
                                                        {new Date(lancamento.create).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>{lancamento.descricao}</TableCell>
                                                    <TableCell>{lancamento.tipo}</TableCell>
                                                    <TableCell align="right">{lancamento.valor ?
                                                        'R$ ' + lancamento.valor.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>

                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Valor Inicio: R$ {valorCaixaAnterior.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Venda PIX: R$ {valorPIXTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Venda Debito/Credito: R$ {valorDebitoCreditoTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Venda Dinheiro: R$ {valorDinheiroTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total Vendas: R$ {valorSunTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total pago: R$ {valorSunPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total troco: R$ {valorSunTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total no caixa: R$ {valorTotalCaixa.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
                                    <DateTimePicker
                                        label="Data de inicio"
                                        value={start}
                                        disabled
                                        onChange={(newValue) => this.onChangeStart(newValue)}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
                                    <DateTimePicker
                                        label="Data de termino"
                                        value={end}
                                        onChange={(newValue) => this.onChangeEnd(newValue)}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField id="user" label="Usuário" variant="outlined"
                                    type="text"
                                    fullWidth
                                    value={user}
                                    onChange={this.onChangeUser}
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Button onClick={this.fecharCaixa} variant="contained" color="primary" fullWidth sx={{ mt: 1 }}>
                                    Fechar Caixa
                                </Button>
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <TextField id="valorCaixaAnterior" label="Caixa anterior" variant="outlined"
                                    type="number"
                                    fullWidth
                                    value={valorCaixaAnterior}
                                    disabled
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
                                    <DateTimePicker
                                        label="Data de inicio"
                                        value={start}
                                        onChange={(newValue) => this.onChangeStart(newValue)}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <TextField id="user" label="Usuário" variant="outlined"
                                    type="text"
                                    fullWidth
                                    value={user}
                                    onChange={this.onChangeUser}
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Button onClick={this.abrirCaixa} variant="contained" color="primary" fullWidth sx={{ mt: 1 }}>
                                    Abrir Caixa
                                </Button>
                            </Grid>
                        </Grid>
                    )}

                </FormControl>
            </div>
        )
    }
}
```

- [ ] **Step 2: Manual verification**

Run `npm start`, go to `/add_caixa`. Confirm: abrir caixa flow, adding lançamentos, the two tables render, fechar caixa. Check desktop and ~390px width.

- [ ] **Step 3: Commit**

```bash
git add src/components/caixa/add-caixa.tsx
git commit -m "Reskin caixa page with the Bom Cream theme"
```

---

### Task 9: Reskin the Produto pages

**Files:**
- Modify: `src/components/produto/add-produto.tsx`
- Modify: `src/components/produto/list-produto.tsx`
- Modify: `src/components/produto/edit-produto.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3). No change to state or handlers in any of the three files.

- [ ] **Step 1: Replace `render()` in `add-produto.tsx`**

Add to the top of `src/components/produto/add-produto.tsx`:

```tsx
import { Grid, TextField, Button, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
    render() {
        const { submitted, uid, nome, valor, tipoMedida, categoria, categorias } = this.state;

        return (
            <div>
                <PageHeader title="Cadastrar Produto" />
                {submitted ? (
                    <div>
                        <Typography variant="h6">Produto enviado com sucesso!</Typography>
                        <Button variant="contained" color="primary" onClick={this.newProduto} sx={{ mt: 1 }}>
                            Voltar
                        </Button>
                    </div>
                ) : (
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Identificador"
                                required
                                value={uid}
                                onChange={this.onChangeUid}
                                name="uid"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Nome"
                                required
                                value={nome}
                                onChange={this.onChangeNome}
                                name="nome"
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="Valor"
                                type="number"
                                required
                                value={valor}
                                onChange={this.onChangeValor}
                                name="valor"
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Select
                                fullWidth
                                id="tipo"
                                value={tipoMedida}
                                onChange={this.onChangeTipoMedida}
                            >
                                <MenuItem value={"Unidade"}>Unidade</MenuItem>
                                <MenuItem value={"Kilograma"}>Kilograma</MenuItem>
                                <MenuItem value={"Aleatorio"}>Aleatório</MenuItem>
                            </Select>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Select
                                fullWidth
                                id="categoria"
                                value={categoria}
                                label="Categoria"
                                onChange={this.onChangeCategoria}
                            >
                                {categorias.map((cat) => (
                                    <MenuItem value={cat.uid} key={cat.uid}>{cat.nome}</MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item xs={12}>
                            <Button component={Link} to="/list_produto/" variant="outlined" color="error" sx={{ mr: 1 }}>
                                Voltar
                            </Button>
                            <Button onClick={this.saveProduto} variant="contained" color="primary">
                                Salvar
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </div>
        );
    }
}
```

- [ ] **Step 2: Replace `render()` in `list-produto.tsx`**

Add to the top of `src/components/produto/list-produto.tsx`:

```tsx
import { Grid, Paper, TextField, Button, List, ListItemButton, ListItemText, Typography, Box } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
      render() {
        const {
            searchNome,
          produtos,
          currentProduto,
          currentIndex,
          page,
          count,
          pageSize,
        } = this.state;

        return (
            <div>
              <PageHeader
                title="Produtos"
                action={
                  <Button component={Link} to="/add_produto/" variant="contained" color="primary">
                    Adicionar novo produto
                  </Button>
                }
              />
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Pesquisar por nome"
                      value={searchNome}
                      onChange={this.onChangeSearchNome}
                    />
                    <Button variant="outlined" color="primary" onClick={this.retrieveProdutos}>
                      Pesquisar
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  {"Quantidade por pagina: "}
                  <Select
                      labelId="demo-simple-select-label"
                      id="pageSize"
                      value={pageSize}
                      label="Quantidade por pagina"
                      onChange={this.handlePageSizeChange} >
                      <MenuItem value={1}>1</MenuItem>
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={10}>10</MenuItem>
                  </Select>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Pagination
                    count={count}
                    page={page}
                    siblingCount={1}
                    boundaryCount={1}
                    variant="outlined"
                    shape="rounded"
                    onChange={this.handlePageChange}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <List component={Paper}>
                      {produtos &&
                      produtos.map((produto, index) => (
                          <ListItemButton
                          selected={index === currentIndex}
                          onClick={() => this.setActiveProduto(produto, index)}
                          key={index}
                          >
                            <ListItemText primary={`${produto.nome} — ${produto.categoria}`} secondary={`R$ ${produto.valor.toLocaleString('pt-br', {minimumFractionDigits: 2})}`} />
                          </ListItemButton>
                        ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={4}>
                  {currentProduto ? (
                      <Box>
                        <Typography variant="h6">Produto</Typography>
                        <Typography><strong>Nome:</strong> {currentProduto.nome}</Typography>
                        <Button component={Link} to={"/list_produto/" + currentProduto.uid} variant="outlined" color="secondary" sx={{ mt: 1 }}>
                            Edit
                        </Button>
                      </Box>
                  ) : (
                      <Typography sx={{ mt: 2 }}>Selecione um produto...</Typography>
                  )}
                </Grid>
              </Grid>
            </div>
        );
    }
}
```

- [ ] **Step 3: Replace `render()` in `edit-produto.tsx`**

Add to the top of `src/components/produto/edit-produto.tsx`:

```tsx
import { Grid, TextField, Button, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
  render() {
    const { currentProduto, categorias } = this.state;

    return (
      <div>
        {currentProduto ? (
          <div>
            <PageHeader title="Editar Produto" />
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="ID"
                  value={currentProduto.uid}
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={currentProduto.nome}
                  onChange={this.onChangeNome}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Valor"
                  type="number"
                  value={currentProduto.valor}
                  onChange={this.onChangeValor}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Select
                  fullWidth
                  id="tipo"
                  value={currentProduto.tipoMedida}
                  onChange={this.onChangeTipoMedida} >
                  <MenuItem value={"Unidade"}>Unidade</MenuItem>
                  <MenuItem value={"Kilograma"}>Kilograma</MenuItem>
                  <MenuItem value={"Aleatorio"}>Aleatorio</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} md={4}>
                <Select
                  fullWidth
                  id="categoria"
                  value={currentProduto.categoria}
                  onChange={this.onChangeCategoria}
                >
                  {categorias.map((cat) => (
                    <MenuItem value={cat.uid} key={cat.uid}>{cat.nome}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12}>
                <Button onClick={this.voltarLista} variant="outlined" sx={{ mr: 1 }}>
                  Voltar
                </Button>
                <Button onClick={this.deleteProduto} variant="outlined" color="error" sx={{ mr: 1 }}>
                  Remover
                </Button>
                <Button onClick={this.updateProduto} variant="contained" color="primary">
                  Atualizar
                </Button>
                <Typography sx={{ mt: 1 }}>{this.state.message}</Typography>
              </Grid>
            </Grid>
          </div>
        ) : (
          <Typography sx={{ mt: 2 }}>Selecione um produto...</Typography>
        )}
      </div>
    );
  }
}
```

- [ ] **Step 4: Manual verification**

Run `npm start`. Add a product, search/paginate/select in the list, edit and delete a product. Check desktop and ~390px width.

- [ ] **Step 5: Commit**

```bash
git add src/components/produto/add-produto.tsx src/components/produto/list-produto.tsx src/components/produto/edit-produto.tsx
git commit -m "Reskin produto pages with the Bom Cream theme"
```

---

### Task 10: Reskin the Categoria pages

**Files:**
- Modify: `src/components/categoria/add-categoria.tsx`
- Modify: `src/components/categoria/list-categoria.tsx`
- Modify: `src/components/categoria/edit-categoria.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3). No change to state or handlers in any of the three files.

- [ ] **Step 1: Replace `render()` in `add-categoria.tsx`**

Add to the top of `src/components/categoria/add-categoria.tsx`:

```tsx
import { Grid, TextField, Button, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
    render() {
        const { submitted, uid, nome, ordem, tipo } = this.state;

        return (
            <div>
                <PageHeader title="Cadastrar Categoria" />
                {submitted ? (
                    <div>
                        <Typography variant="h6">Categoria enviado com sucesso!</Typography>
                        <Button variant="contained" color="primary" onClick={this.newCategoria} sx={{ mt: 1 }}>
                            Voltar
                        </Button>
                    </div>
                ) : (
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Identificador"
                                required
                                value={uid}
                                onChange={this.onChangeUid}
                                name="uid"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Nome"
                                required
                                value={nome}
                                onChange={this.onChangeNome}
                                name="nome"
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="Ordem"
                                type="number"
                                required
                                value={ordem}
                                onChange={this.onChangeOrdem}
                                name="ordem"
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Select
                                fullWidth
                                id="tipo"
                                value={tipo}
                                onChange={this.onChangeTipo}
                            >
                                <MenuItem value={"visivel"}>Visivel</MenuItem>
                                <MenuItem value={"oculto"}>Oculto</MenuItem>
                            </Select>
                        </Grid>
                        <Grid item xs={12}>
                            <Button component={Link} to="/list_categoria/" variant="outlined" color="error" sx={{ mr: 1 }}>
                                Voltar
                            </Button>
                            <Button onClick={this.saveCategoria} variant="contained" color="primary">
                                Salvar
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </div>
        );
    }
}
```

- [ ] **Step 2: Replace `render()` in `list-categoria.tsx`**

Add to the top of `src/components/categoria/list-categoria.tsx`:

```tsx
import { Grid, Paper, Button, List, ListItemButton, ListItemText, Typography, Box } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
  render() {
    const {
      categorias,
      currentCategoria,
      currentIndex,
    } = this.state;

    return (
      <div>
        <PageHeader
          title="Categorias"
          action={
            <Button component={Link} to="/add_categoria/" variant="contained" color="primary">
              Adicionar novo categoria
            </Button>
          }
        />
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Pagination
              siblingCount={1}
              boundaryCount={1}
              variant="outlined"
              shape="rounded"
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <List component={Paper}>
              {categorias &&
                categorias.map((categoria, index) => (
                  <ListItemButton
                    selected={index === currentIndex}
                    onClick={() => this.setActiveCategoria(categoria, index)}
                    key={index}
                  >
                    <ListItemText primary={categoria.nome} secondary={`Ordem: ${categoria.ordem} · ${categoria.tipo}`} />
                  </ListItemButton>
                ))}
            </List>
          </Grid>
          <Grid item xs={12} md={4}>
            {currentCategoria ? (
              <Box>
                <Typography variant="h6">Categoria</Typography>
                <Typography><strong>Nome:</strong> {currentCategoria.nome}</Typography>
                <Button component={Link} to={"/list_categoria/" + currentCategoria.uid} variant="outlined" color="secondary" sx={{ mt: 1 }}>
                  Edit
                </Button>
              </Box>
            ) : (
              <Typography sx={{ mt: 2 }}>Selecione um categoria...</Typography>
            )}
          </Grid>
        </Grid>
      </div>
    );
  }
}
```

- [ ] **Step 3: Replace `render()` in `edit-categoria.tsx`**

Add to the top of `src/components/categoria/edit-categoria.tsx`:

```tsx
import { Grid, TextField, Button, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
  render() {
    const { currentCategoria } = this.state;

    return (
      <div>
        {currentCategoria ? (
          <div>
            <PageHeader title="Editar Categoria" />
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="ID" value={currentCategoria.uid} disabled />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField fullWidth label="Nome" value={currentCategoria.nome} onChange={this.onChangeNome} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Ordem" type="number" value={currentCategoria.ordem} onChange={this.onChangeOrdem} />
              </Grid>
              <Grid item xs={12} md={3}>
                <Select
                  fullWidth
                  id="tipo"
                  value={currentCategoria.tipo}
                  onChange={this.onChangeTipo} >
                  <MenuItem value={"visivel"}>Visivel</MenuItem>
                  <MenuItem value={"oculto"}>Oculto</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12}>
                <Button onClick={this.voltarLista} variant="outlined" sx={{ mr: 1 }}>
                  Voltar
                </Button>
                <Button onClick={this.deleteCategoria} variant="outlined" color="error" sx={{ mr: 1 }}>
                  Remover
                </Button>
                <Button onClick={this.updateCategoria} variant="contained" color="primary">
                  Atualizar
                </Button>
                <Typography sx={{ mt: 1 }}>{this.state.message}</Typography>
              </Grid>
            </Grid>
          </div>
        ) : (
          <Typography sx={{ mt: 2 }}>Selecione um categoria...</Typography>
        )}
      </div>
    );
  }
}
```

- [ ] **Step 4: Manual verification**

Run `npm start`. Add, list/select, and edit/delete a categoria. Check desktop and ~390px width.

- [ ] **Step 5: Commit**

```bash
git add src/components/categoria/add-categoria.tsx src/components/categoria/list-categoria.tsx src/components/categoria/edit-categoria.tsx
git commit -m "Reskin categoria pages with the Bom Cream theme"
```

---

### Task 11: Reskin the Funcionário pages

**Files:**
- Modify: `src/components/funcionario/add-funcionario.tsx`
- Modify: `src/components/funcionario/list-funcionario.tsx`
- Modify: `src/components/funcionario/edit-funcionario.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3). No change to state or handlers in any of the three files.

- [ ] **Step 1: Replace `render()` in `add-funcionario.tsx`**

Add to the top of `src/components/funcionario/add-funcionario.tsx`:

```tsx
import { Grid, TextField, Button, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
    render() {
        const { submitted, cpf, nome, valorHora } = this.state;

        return (
            <div>
                <PageHeader title="Cadastrar Funcionario" />
                {submitted ? (
                    <div>
                        <Typography variant="h6">Funcionario enviado com sucesso!</Typography>
                        <Button variant="contained" color="primary" onClick={this.newFuncionario} sx={{ mt: 1 }}>
                            Voltar
                        </Button>
                    </div>
                ) : (
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Identificador"
                                required
                                value={cpf}
                                onChange={this.onChangeUid}
                                name="cpf"
                            />
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <TextField
                                fullWidth
                                label="Nome"
                                required
                                value={nome}
                                onChange={this.onChangeNome}
                                name="nome"
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Valor hora"
                                type="number"
                                required
                                value={valorHora}
                                onChange={this.onChangeValor}
                                name="ordem"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button component={Link} to="/list_funcionario/" variant="outlined" color="error" sx={{ mr: 1 }}>
                                Voltar
                            </Button>
                            <Button onClick={this.saveFuncionario} variant="contained" color="primary">
                                Salvar
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </div>
        );
    }
}
```

- [ ] **Step 2: Replace `render()` in `list-funcionario.tsx`**

Add to the top of `src/components/funcionario/list-funcionario.tsx`:

```tsx
import { Grid, Paper, Button, List, ListItemButton, ListItemText, Typography, Box } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace the `render()` method with:

```tsx
  render() {
    const {
      funcionario,
      currentFuncionario,
      currentIndex,
    } = this.state;

    return (
      <div>
        <PageHeader
          title="Funcionarios"
          action={
            <Button component={Link} to="/add_funcionario/" variant="contained" color="primary">
              Adicionar novo funcionario
            </Button>
          }
        />
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Pagination
              siblingCount={1}
              boundaryCount={1}
              variant="outlined"
              shape="rounded"
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <List component={Paper}>
              {funcionario &&
                funcionario.map((func, index) => (
                  <ListItemButton
                    selected={index === currentIndex}
                    onClick={() => this.setActiveFuncionario(func, index)}
                    key={index}
                  >
                    <ListItemText primary={`${func.cpf} — ${func.nome}`} secondary={`R$ ${func.valorHora.toLocaleString('pt-br', {minimumFractionDigits: 2})}`} />
                  </ListItemButton>
                ))}
            </List>
          </Grid>
          <Grid item xs={12} md={4}>
            {currentFuncionario ? (
              <Box>
                <Typography variant="h6">Funcionario</Typography>
                <Typography><strong>Nome:</strong> {currentFuncionario.nome}</Typography>
                <Button component={Link} to={"/list_Funcionario/" + currentFuncionario.cpf} variant="outlined" color="secondary" sx={{ mt: 1 }}>
                  Edit
                </Button>
              </Box>
            ) : (
              <Typography sx={{ mt: 2 }}>Selecione um Funcionario...</Typography>
            )}
          </Grid>
        </Grid>
      </div>
    );
  }
}
```

- [ ] **Step 3: Replace `render()` in `edit-funcionario.tsx`**

This file has the most complex layout (year/month tabs). Add to the top of `src/components/funcionario/edit-funcionario.tsx`:

```tsx
import { Grid, Button, Typography, Box } from "@mui/material";
import PageHeader from "../shell/PageHeader";
```

Replace only the outer wrapper and the top form grid of `render()` — keep the `TabContext`/`Tabs`/`TabPanel` block (lines computing `mes.dias.map(...)`) exactly as it is today, since it's dense per-day data entry, not a candidate for a Grid rewrite in this pass. Apply this diff:

Replace:
```tsx
      <div>
        {currentFuncionario ? (
          <div className="edit-form ">
            <h4>Editar Funcionario</h4>
            <form>
              <div className="row">
                <div className="form-group col-2">
                  <label htmlFor="identificador">Identificador</label>
                  <input
                    type="text"
                    className="form-control"
                    id="identificador"
                    value={currentFuncionario.cpf}
                    disabled={true}
                  />
                </div>
                <div className="form-group col-6">
                  <label htmlFor="nome">Nome</label>
                  <input
                    type="text"
                    className="form-control"
                    id="nome"
                    value={currentFuncionario.nome}
                    onChange={this.onChangeNome}
                  />
                </div>
                <div className="form-group col-2">
                  <label htmlFor="valorHora">Valor Hora</label>
                  <input
                    type="number"
                    className="form-control"
                    id="valorHora"
                    value={currentFuncionario.valorHora}
                    onChange={this.onChangeValor}
                  />
                </div>
                <div className="form-group col-2">
                  <label htmlFor="ano">Ano</label>
                  <Select
                    id="ano"
                    className="form-control"
                    value={currentAno}
                    label="Categoria"
                    onChange={this.onChangeAno}
                  >
                    {currentFuncionario.anos.map((ano) => (
                      <MenuItem value={ano.ano}>{ano.ano}</MenuItem>
                    ))}
                  </Select>
                </div>
              </div>
```

With:
```tsx
      <div>
        {currentFuncionario ? (
          <div>
            <PageHeader title="Editar Funcionario" />
            <form>
              <Grid container spacing={2}>
                <Grid item xs={12} md={2}>
                  <TextField fullWidth label="Identificador" value={currentFuncionario.cpf} disabled />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField fullWidth label="Nome" value={currentFuncionario.nome} onChange={this.onChangeNome} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField fullWidth label="Valor Hora" type="number" value={currentFuncionario.valorHora} onChange={this.onChangeValor} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Select
                    fullWidth
                    id="ano"
                    value={currentAno}
                    onChange={this.onChangeAno}
                  >
                    {currentFuncionario.anos.map((ano) => (
                      <MenuItem value={ano.ano} key={ano.ano}>{ano.ano}</MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
```

(This requires adding `TextField` to the existing MUI import line in this file too — it currently imports `Select, MenuItem, SelectChangeEvent, Tabs, Tab, TextField, InputAdornment`, which already includes `TextField`, so no import change needed there.)

Then close the extra `</div>` this introduced: since the original had `</form>` immediately followed by a plain `<div className="row">` for "Novo Ano" and another for the action buttons, replace those two blocks too:

Replace:
```tsx
            </form>
            <div className="row">
              <div className="form-group col-2">
                <label htmlFor="novoAno">Novo Ano</label>
                <input
                  type="number"
                  className="form-control"
                  id="novoAno"
                  value={newAno}
                  onChange={this.onChangeNovoAno}
                />
              </div>
              <div className="form-group col-2" style={{alignSelf: "end"}}>
                  <button type="submit"
                    className="btn btn-success"
                    onClick={this.addNewAno}>
                      Adicionar Novo Ano
                  </button>
              </div>
            </div>

            <div className="row">
              <button
                className="badge mr-2"
                onClick={this.voltarLista}
              >
                Voltar
              </button>

              <button
                className="badge badge-danger mr-2"
                onClick={this.deleteFuncionario}
              >
                Remover
              </button>

              <button
                type="submit"
                className="btn btn-success"
                onClick={this.updateFuncionario}
              >
                Atualizar
              </button>
            </div>
            <p>{this.state.message}</p>
          </div>
        ) : (
          <div>
            <br />
            <p>Selecione um funcionario...</p>
          </div>
        )}
      </div>
    );
  }
}
```

With:
```tsx
            </form>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Novo Ano" type="number" value={newAno} onChange={this.onChangeNovoAno} />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button type="submit" variant="contained" color="primary" fullWidth onClick={this.addNewAno}>
                  Adicionar Novo Ano
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Button onClick={this.voltarLista} variant="outlined" sx={{ mr: 1 }}>
                Voltar
              </Button>
              <Button onClick={this.deleteFuncionario} variant="outlined" color="error" sx={{ mr: 1 }}>
                Remover
              </Button>
              <Button type="submit" onClick={this.updateFuncionario} variant="contained" color="primary">
                Atualizar
              </Button>
            </Box>
            <Typography sx={{ mt: 1 }}>{this.state.message}</Typography>
          </div>
        ) : (
          <Typography sx={{ mt: 2 }}>Selecione um funcionario...</Typography>
        )}
      </div>
    );
  }
}
```

- [ ] **Step 4: Manual verification**

Run `npm start`. Add a funcionario, list/select, and open edit — check the year/month tabs still work exactly as before (this is unchanged logic, so this is mostly confirming nothing broke from the surrounding Grid edits), add a new ano, update, delete. Check desktop and ~390px width (the tab panel is wide/dense — confirm it at least scrolls horizontally without breaking the rest of the page on mobile).

- [ ] **Step 5: Commit**

```bash
git add src/components/funcionario/add-funcionario.tsx src/components/funcionario/list-funcionario.tsx src/components/funcionario/edit-funcionario.tsx
git commit -m "Reskin funcionario pages with the Bom Cream theme"
```

---

### Task 12: Remove Bootstrap and do the final cross-app QA pass

**Files:**
- Modify: `package.json` (remove `bootstrap` dependency)
- Modify: any remaining file still importing `bootstrap/dist/css/bootstrap.min.css` (should only have been `App.tsx`, already removed in Task 5 — this task double-checks)

**Interfaces:** none (cleanup only).

- [ ] **Step 1: Confirm no file still references Bootstrap CSS or Bootstrap-only classes**

Run:
```bash
grep -rn "bootstrap" src/ --include="*.tsx" --include="*.ts"
```
Expected: no output (no remaining imports). Also run:
```bash
grep -rnE "className=\"(row|col-|btn |form-control|form-group|list-group|badge )" src/ --include="*.tsx"
```
Expected: no output — every page task above should have removed these. If anything remains, fix it inline before continuing (it means a task above missed a spot).

- [ ] **Step 2: Uninstall the Bootstrap package**

Run:
```bash
npm uninstall bootstrap
```
Expected: `package.json`'s `dependencies` no longer lists `bootstrap`.

- [ ] **Step 3: Full manual QA pass**

Run `npm start` and, at both a desktop width (≥1280px) and a mobile width (~390px), walk every route once: `/login`, `/add_venda` (full sale + pagamento pendente + imprimir), `/add_caixa` (abrir/fechar + lançamento), `/list_vendas`, `/add_produto` + `/list_produto` + edit, `/add_categoria` + `/list_categoria` + edit, `/add_funcionario` + `/list_funcionario` + edit. Confirm: navy sidebar/drawer navigation works and is permission-gated correctly for an admin login vs a caixa login (check `UsuarioService`/seed data or your local Mongo users for both roles), the pink `PageHeader` appears on every page with the right title, no Bootstrap-styled buttons/lists remain, and no console errors appear (`npm run build` also succeeds cleanly).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Remove Bootstrap dependency after completing the visual redesign"
```
