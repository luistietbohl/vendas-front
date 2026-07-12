import { Component } from "react";
import FuncionarioService from "../../services/funcionario.service";
import FuncionarioDTO from "../../types/funcionario.type";
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
  funcionario: Array<FuncionarioDTO>,
  currentFuncionario: FuncionarioDTO | null,
  currentIndex: number,
};

export default class FuncionarioList extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.retrieveFuncionario = this.retrieveFuncionario.bind(this);
    this.refreshList = this.refreshList.bind(this);

    this.state = {
      funcionario: [],
      currentFuncionario: null,
      currentIndex: -1,
    };
  }

  componentDidMount() {
    this.retrieveFuncionario();
  }

  retrieveFuncionario() {
    FuncionarioService.getAll()
      .then((response) => {

        this.setState({
          funcionario: response.data,
        });

      })
      .catch((e) => {
        console.log(e);
      });
  }

  refreshList() {
    this.retrieveFuncionario();
    this.setState({
      currentFuncionario: null,
      currentIndex: -1,
    });
  }

  setActiveFuncionario(funcionario: FuncionarioDTO, index: number) {
    this.setState({
      currentFuncionario: funcionario,
      currentIndex: index,
    });
  }

  render() {
    const {
      funcionario,
      currentFuncionario,
      currentIndex,
    } = this.state;

    return (
      <div>
        <PageHeader
          title="Funcionários"
          action={
            <Button
              component={Link}
              to={"/add_funcionario/"}
              variant="contained"
              color="primary"
            >
              Adicionar novo funcionario
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
              <Table size="small" aria-label="lista de funcionarios">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell align="right">Valor/Hora</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {funcionario &&
                    funcionario.map((funcionario, index) => (
                      <TableRow
                        hover
                        selected={index === currentIndex}
                        onClick={() => this.setActiveFuncionario(funcionario, index)}
                        key={index}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: "pointer" }}
                      >
                        <TableCell component="th" scope="row">
                          <Typography fontWeight={700}>{funcionario.nome}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          R$ {funcionario.valorHora.toLocaleString('pt-br', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            {currentFuncionario ? (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Funcionario</Typography>
                <Typography sx={{ mb: 2 }}>
                  <strong>Nome:</strong> {currentFuncionario.nome}
                </Typography>
                <Button
                  component={Link}
                  to={"/list_funcionario/" + currentFuncionario.cpf}
                  variant="outlined"
                  color="secondary"
                >
                  Editar
                </Button>
              </Paper>
            ) : (
              <Typography sx={{ p: 2 }}>Selecione um Funcionario...</Typography>
            )}
          </Grid>
        </Grid>
      </div>
    );
  }
}