import { Component, ChangeEvent } from "react";
import { RouteComponentProps } from 'react-router-dom';
import {
  Select, MenuItem, SelectChangeEvent,
  Box, Button, FormControl, Grid, InputLabel, Paper, TextField, Typography,
} from "@mui/material";

import CategoriaService from "../../services/categoria.service";
import CategoriaDTO from "../../types/categoria.type";
import PageHeader from "../shell/PageHeader";

interface RouterProps {
  id: string;
}

type Props = RouteComponentProps<RouterProps>;

type State = {
  currentCategoria: CategoriaDTO;
  message: string;
}

export default class EditCategoria extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.onChangeNome = this.onChangeNome.bind(this);
    this.onChangeOrdem = this.onChangeOrdem.bind(this);
    this.onChangeTipo = this.onChangeTipo.bind(this);
    this.getCategoria = this.getCategoria.bind(this);
    this.updateCategoria = this.updateCategoria.bind(this);
    this.deleteCategoria = this.deleteCategoria.bind(this);
    this.voltarLista = this.voltarLista.bind(this);

    this.state = {
      currentCategoria: {
        uid: null,
        nome: "",
        ordem: 0,
        tipo: "",
      },
      message: "",
    }
  }

  componentDidMount() {
    this.getCategoria(this.props.match.params.id);
  }

  onChangeNome(e: ChangeEvent<HTMLInputElement>) {
    const nome = e.target.value;
    this.setState(function (prevState) {
      return {
        currentCategoria: {
          ...prevState.currentCategoria,
          nome: nome,
        },
      };
    });
  }

  onChangeOrdem(e: ChangeEvent<HTMLInputElement>) {
    const ordem = e.target.valueAsNumber;
    this.setState(function (prevState) {
      return {
        currentCategoria: {
          ...prevState.currentCategoria,
          ordem: ordem,
        },
      };
    });
  }

  onChangeTipo(event: SelectChangeEvent<string>) {
    const tipo = event.target.value as string;
    this.setState(function (prevState) {
      return {
        currentCategoria: {
          ...prevState.currentCategoria,
          tipo: tipo,
        },
      };
    });
  }

  getCategoria(id: string) {
    CategoriaService.get(id)
      .then((response: any) => {
        this.setState({
          currentCategoria: response.data,
        });

      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  updateCategoria() {
    CategoriaService.edit(
      this.state.currentCategoria.uid,
      this.state.currentCategoria
    )
      .then((response: any) => {

        this.setState({
          message: "Sucesso ao alterar o categoria!",
        });
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  deleteCategoria() {
    CategoriaService.delete(this.state.currentCategoria.uid)
      .then((response: any) => {

        this.voltarLista();
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  voltarLista() {
    this.props.history.push("/list_categoria");
  }

  render() {
    const { currentCategoria } = this.state;

    return (
      <div>
        {currentCategoria ? (
          <div>
            <PageHeader title="Editar Categoria" />
            <Paper sx={{ p: 3, maxWidth: 500, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ID"
                    value={currentCategoria.uid}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={currentCategoria.nome}
                    onChange={this.onChangeNome}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Ordem"
                    type="number"
                    value={currentCategoria.ordem}
                    onChange={this.onChangeOrdem}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="tipo-select-label">Tipo</InputLabel>
                    <Select
                      labelId="tipo-select-label"
                      id="tipo"
                      value={currentCategoria.tipo}
                      label="Tipo"
                      onChange={this.onChangeTipo} >
                      <MenuItem value={"visivel"}>Visivel</MenuItem>
                      <MenuItem value={"oculto"}>Oculto</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" onClick={this.voltarLista}>
                Voltar
              </Button>
              <Button variant="outlined" color="error" onClick={this.deleteCategoria}>
                Remover
              </Button>
              <Button variant="contained" color="primary" onClick={this.updateCategoria}>
                Atualizar
              </Button>
            </Box>
            {this.state.message && <Typography sx={{ mt: 2 }}>{this.state.message}</Typography>}
          </div>
        ) : (
          <Typography sx={{ p: 2 }}>Selecione um categoria...</Typography>
        )}
      </div>
    );
  }
}
