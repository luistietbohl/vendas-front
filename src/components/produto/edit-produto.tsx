import { Component, ChangeEvent } from "react";
import { RouteComponentProps } from 'react-router-dom';
import {
  Select, MenuItem, SelectChangeEvent,
  Box, Button, FormControl, Grid, InputLabel, Paper, TextField, Typography,
} from "@mui/material";

import ProdutoService from "../../services/produto.service";
import ProdutoDTO from "../../types/produto.type";
import CategoriaDTO from "../../types/categoria.type";
import CategoriaService from "../../services/categoria.service";
import PageHeader from "../shell/PageHeader";

interface RouterProps {
  id: string;
}

type Props = RouteComponentProps<RouterProps>;

type State = {
  currentProduto: ProdutoDTO,
  categorias: Array<CategoriaDTO>,
  message: string;
}

export default class EditProduto extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.onChangeNome = this.onChangeNome.bind(this);
    this.onChangeValor = this.onChangeValor.bind(this);
    this.onChangeTipoMedida = this.onChangeTipoMedida.bind(this);
    this.onChangeCategoria = this.onChangeCategoria.bind(this);
    this.getProduto = this.getProduto.bind(this);
    this.updateProduto = this.updateProduto.bind(this);
    this.deleteProduto = this.deleteProduto.bind(this);
    this.voltarLista = this.voltarLista.bind(this);

    this.state = {
      currentProduto: {
        uid: null,
        nome: "",
        valor: 0,
        categoria: "",
        tipoMedida: "",
      },
      categorias: [],
      message: "",
    }
  }

  componentDidMount() {
    this.retrieveCategorias();
    this.getProduto(this.props.match.params.id);
  }

  retrieveCategorias() {
    CategoriaService.getAll()
      .then((response) => {

        this.setState({
          categorias: response.data,
        });

      })
      .catch((e) => {
        console.log(e);
      });
  }

  onChangeNome(e: ChangeEvent<HTMLInputElement>) {
    const nome = e.target.value;
    this.setState(function (prevState) {
      return {
        currentProduto: {
          ...prevState.currentProduto,
          nome: nome,
        },
      };
    });
  }

  onChangeValor(e: ChangeEvent<HTMLInputElement>) {
    const valor = e.target.valueAsNumber;
    this.setState(function (prevState) {
      return {
        currentProduto: {
          ...prevState.currentProduto,
          valor: valor,
        },
      };
    });
  }

  onChangeTipoMedida(event: SelectChangeEvent<string>) {
    const tipo = event.target.value as string;
    this.setState(function (prevState) {
      return {
        currentProduto: {
          ...prevState.currentProduto,
          tipoMedida: tipo,
        },
      };
    });
  }

  onChangeCategoria(event: SelectChangeEvent<string>) {
    const categoria = event.target.value as string;
    this.setState(function (prevState) {
      return {
        currentProduto: {
          ...prevState.currentProduto,
          categoria: categoria,
        },
      };
    });
  }

  getProduto(id: string) {
    ProdutoService.get(id)
      .then((response: any) => {
        this.setState({
          currentProduto: response.data,
        });

      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  updateProduto() {
    ProdutoService.edit(
      this.state.currentProduto.uid,
      this.state.currentProduto
    )
      .then((response: any) => {

        this.setState({
          message: "Sucesso ao alterar o produto!",
        });
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  deleteProduto() {
    ProdutoService.delete(this.state.currentProduto.uid)
      .then((response: any) => {

        this.voltarLista();
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  voltarLista() {
    this.props.history.push("/list_produto");
  }

  render() {
    const { currentProduto, categorias } = this.state;

    return (
      <div>
        {currentProduto ? (
          <div>
            <PageHeader title="Editar Produto" />
            <Paper sx={{ p: 3, maxWidth: 500, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ID"
                    value={currentProduto.uid}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={currentProduto.nome}
                    onChange={this.onChangeNome}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Valor"
                    type="number"
                    value={currentProduto.valor}
                    onChange={this.onChangeValor}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="tipo-select-label">Tipo de Medida</InputLabel>
                    <Select
                      labelId="tipo-select-label"
                      id="tipo"
                      value={currentProduto.tipoMedida}
                      label="Tipo de Medida"
                      onChange={this.onChangeTipoMedida} >
                      <MenuItem value={"Unidade"}>Unidade</MenuItem>
                      <MenuItem value={"Kilograma"}>Kilograma</MenuItem>
                      <MenuItem value={"Aleatorio"}>Aleatorio</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="categoria-select-label">Categoria</InputLabel>
                    <Select
                      labelId="categoria-select-label"
                      id="categoria"
                      value={currentProduto.categoria}
                      label="Categoria"
                      onChange={this.onChangeCategoria}
                    >
                      {categorias.map((cat) => (
                        <MenuItem value={cat.uid} key={cat.uid}>{cat.nome}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" onClick={this.voltarLista}>
                Voltar
              </Button>
              <Button variant="outlined" color="error" onClick={this.deleteProduto}>
                Remover
              </Button>
              <Button variant="contained" color="primary" onClick={this.updateProduto}>
                Atualizar
              </Button>
            </Box>
            {this.state.message && <Typography sx={{ mt: 2 }}>{this.state.message}</Typography>}
          </div>
        ) : (
          <Typography sx={{ p: 2 }}>Selecione um produto...</Typography>
        )}
      </div>
    );
  }
}
