import { Component } from "react";
import { Switch, Route } from "react-router-dom";
import { Box } from "@mui/material";
import "./App.css";

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

type Props = {};

type State = {
  showAdminBoard: boolean,
  showCaixaBoard: boolean,
  currentUser: string | null
}

class App extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.logOut = this.logOut.bind(this);

    this.state = {
      showAdminBoard: false,
      showCaixaBoard: false,
      currentUser: null,
    };
  }

  componentDidMount() {
    const user = authService.getCurrentUser();

    if (user) {
      this.setState({
        currentUser: user,
        showAdminBoard: user && user === "admin" ? true : false,
        showCaixaBoard: user && user === "caixa" ? true : false,
      });
    }

    document.addEventListener("logout", (e) => this.logOut);
  }

  componentWillUnmount() {
    document.removeEventListener("logout", this.logOut);
  }

  logOut() {
    authService.logout();
    this.setState({
      showAdminBoard: false,
      showCaixaBoard: false,
      currentUser: null,
    });
  }

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
