import { Component } from "react";
import CategoriaService from "../../services/categoria.service";
import CategoriaDTO from "../../types/categoria.type";
import { Link } from "react-router-dom";
import Pagination from '@mui/material/Pagination'
import {
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PageHeader from "../shell/PageHeader";

type Props = {};

type State = {
  categorias: Array<CategoriaDTO>,
  currentCategoria: CategoriaDTO | null,
  currentIndex: number,
};

export default class CategoriaList extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.retrieveCategorias = this.retrieveCategorias.bind(this);
    this.refreshList = this.refreshList.bind(this);

    this.state = {
      categorias: [],
      currentCategoria: null,
      currentIndex: -1,
    };
  }

  componentDidMount() {
    this.retrieveCategorias();
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

  refreshList() {
    this.retrieveCategorias();
    this.setState({
      currentCategoria: null,
      currentIndex: -1,
    });
  }

  setActiveCategoria(categoria: CategoriaDTO, index: number) {
    this.setState({
      currentCategoria: categoria,
      currentIndex: index,
    });
  }

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
            <Button
              component={Link}
              to={"/add_categoria/"}
              variant="contained"
              color="primary"
            >
              Adicionar novo categoria
            </Button>
          }
        />
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Pagination
              className="mb-3"
              siblingCount={1}
              boundaryCount={1}
              variant="outlined"
              shape="rounded"
            />
            <TableContainer component={Paper}>
              <Table size="small" aria-label="lista de categorias">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell align="right">Ordem</TableCell>
                    <TableCell>Tipo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categorias &&
                    categorias.map((categoria, index) => (
                      <TableRow
                        hover
                        selected={index === currentIndex}
                        onClick={() => this.setActiveCategoria(categoria, index)}
                        key={index}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: "pointer" }}
                      >
                        <TableCell component="th" scope="row">
                          <Typography fontWeight={700}>{categoria.nome}</Typography>
                        </TableCell>
                        <TableCell align="right">{categoria.ordem}</TableCell>
                        <TableCell>{categoria.tipo}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {currentCategoria ? (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Categoria</Typography>
                <Typography sx={{ mb: 2 }}>
                  <strong>Nome:</strong> {currentCategoria.nome}
                </Typography>
                <Button
                  component={Link}
                  to={"/list_categoria/" + currentCategoria.uid}
                  variant="outlined"
                  color="secondary"
                >
                  Editar
                </Button>
              </Paper>
            ) : (
              <Typography sx={{ p: 2 }}>Selecione um categoria...</Typography>
            )}
          </Grid>
        </Grid>
      </div>
    );
  }
}