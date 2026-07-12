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
