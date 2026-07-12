import { Component, ChangeEvent } from "react";
import ProdutoService from "../../services/produto.service";
import FilterProdutoDTO from "../../types/produto-filter.type";
import ProdutoDTO from "../../types/produto.type";
import { Link } from "react-router-dom";
import Pagination from '@mui/material/Pagination'
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  FormControl,
  Grid,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "../shell/PageHeader";

type Props = {};

type State = {
    produtos: Array<ProdutoDTO>,
    currentProduto: ProdutoDTO | null,
    currentIndex: number,
    searchNome: string,
    page: number,
    count: number,
    pageSize: number,
};

export default class ProdutoList extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.onChangeSearchNome = this.onChangeSearchNome.bind(this);
        this.retrieveProdutos = this.retrieveProdutos.bind(this);
        this.refreshList = this.refreshList.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.handlePageSizeChange = this.handlePageSizeChange.bind(this);

        this.state = {
            produtos: [],
            currentProduto: null,
            currentIndex: -1,
            searchNome: "",
    
            page: 1,
            count: 0,
            pageSize: 10,
        };
    }

    componentDidMount() {
        this.retrieveProdutos();
      }

    onChangeSearchNome(e: ChangeEvent<HTMLInputElement>) {
        const searchNome = e.target.value;
    
        this.setState({
            searchNome: searchNome,
        });
    }

    retrieveProdutos() {
        const data: FilterProdutoDTO = {
            nome: this.state.searchNome,
            start: null,
            end: null,
        };
    
        ProdutoService.filter(this.state.page - 1, this.state.pageSize, data)
          .then((response) => {
    
            this.setState({
                produtos: response.data.content,
                count: response.data.totalPages,
            });
            
          })
          .catch((e) => {
            console.log(e);
          });
      }

      refreshList() {
        this.retrieveProdutos();
        this.setState({
          currentProduto: null,
          currentIndex: -1,
        });
      }

      handlePageChange(event: ChangeEvent<unknown>, page: number) {
        this.setState(
          {
            page: page,
          },
          () => {
            this.retrieveProdutos();
          }
        );
      }
    
      handlePageSizeChange(event: SelectChangeEvent<number>) {
        const pageSize = event.target.value as number;
        this.setState(
          {
            pageSize: pageSize,
            page: 1
          },
          () => {
            this.retrieveProdutos();
          }
        );
      }

      setActiveProduto(produto: ProdutoDTO, index: number) {
        this.setState({
          currentProduto: produto,
          currentIndex: index,
        });
      }

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
                  <Button
                    component={Link}
                    to={"/add_produto/"}
                    variant="contained"
                    color="primary"
                  >
                    Adicionar novo produto
                  </Button>
                }
              />
              <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                  <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth
                        label="Pesquisar por nome"
                        variant="outlined"
                        size="small"
                        value={searchNome}
                        onChange={this.onChangeSearchNome}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        onClick={this.retrieveProdutos}
                      >
                        Pesquisar
                      </Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="pageSize-select-label">Quantidade por página</InputLabel>
                        <Select
                          labelId="pageSize-select-label"
                          id="pageSize"
                          value={pageSize}
                          label="Quantidade por página"
                          onChange={this.handlePageSizeChange}
                        >
                          <MenuItem value={1}>1</MenuItem>
                          <MenuItem value={5}>5</MenuItem>
                          <MenuItem value={10}>10</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Pagination
                    className="mb-3"
                    count={count}
                    page={page}
                    siblingCount={1}
                    boundaryCount={1}
                    variant="outlined"
                    shape="rounded"
                    onChange={this.handlePageChange}
                  />
                  <TableContainer component={Paper}>
                    <Table size="small" aria-label="lista de produtos">
                      <TableHead>
                        <TableRow>
                          <TableCell>Nome</TableCell>
                          <TableCell>Categoria</TableCell>
                          <TableCell align="right">Valor</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {produtos &&
                          produtos.map((produto, index) => (
                            <TableRow
                              hover
                              selected={index === currentIndex}
                              onClick={() => this.setActiveProduto(produto, index)}
                              key={index}
                              sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: "pointer" }}
                            >
                              <TableCell component="th" scope="row">
                                <Typography fontWeight={700}>{produto.nome}</Typography>
                              </TableCell>
                              <TableCell>{produto.categoria}</TableCell>
                              <TableCell align="right">
                                R$ {produto.valor.toLocaleString('pt-br', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={5}>
                  {currentProduto ? (
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>Produto</Typography>
                      <Typography sx={{ mb: 2 }}>
                        <strong>Nome:</strong> {currentProduto.nome}
                      </Typography>
                      <Button
                        component={Link}
                        to={"/list_produto/" + currentProduto.uid}
                        variant="outlined"
                        color="secondary"
                      >
                        Editar
                      </Button>
                    </Paper>
                  ) : (
                    <Typography sx={{ p: 2 }}>Selecione um produto...</Typography>
                  )}
                </Grid>
              </Grid>
            </div>
        );
    }
}