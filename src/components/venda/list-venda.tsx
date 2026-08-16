import { ChangeEvent, Component } from "react";
import VendaDTO from "../../types/venda.type";
import FilterVendaDTO from "../../types/venda-filter.type";
import VendaService from "../../services/venda.service";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/en-gb';
import moment from "moment";
import { InputAdornment, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button } from "@mui/material";
import PageHeader from "../shell/PageHeader";
import { Box, Grid, Typography } from "@mui/material";
import NotaFiscalPanel from "./nota-fiscal-panel";

type Props = {};

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
};

export default class VendaList extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.retrieveVendas = this.retrieveVendas.bind(this);
    this.refreshList = this.refreshList.bind(this);
    this.onChangeStart = this.onChangeStart.bind(this);
    this.setActiveVenda = this.setActiveVenda.bind(this);
    this.deleteVenda = this.deleteVenda.bind(this);
    this.updateVenda = this.updateVenda.bind(this);
    this.onChangeFormaPagamento = this.onChangeFormaPagamento.bind(this);
    this.onChangeValorPago = this.onChangeValorPago.bind(this);

    this.state = {
      vendas: [],
      currentVenda: null,
      start: dayjs(new Date()).hour(0).minute(0).second(0),
      end: dayjs(new Date()).hour(23).minute(59).second(59),
      valorSunTotal: 0,
      valorSunPago: 0,
      valorSunTroco: 0,
      valorPIXTotal: 0,
      valorDinheiroTotal: 0,
      valorDebitoTotal: 0,
      valorCreditoTotal: 0,
    };
  }

  componentDidMount() {
    this.retrieveVendas();
  }

  retrieveVendas() {
    const data: FilterVendaDTO = {
      start: this.state.start ? moment(this.state.start.toDate()).format('yyyy-MM-DDTHH:mm:ss') : null,
      end: this.state.end ? moment(this.state.end.toDate()).format('yyyy-MM-DDTHH:mm:ss') : null,
    };

    VendaService.filterList(data)
      .then((response) => {

        this.setState({
          vendas: response.data,
          valorSunTotal: response.data.reduce((sum, x) => sum + x.valorTotal, 0),
          valorPIXTotal: response.data.filter(v => v.formaPagamento === "PIX").reduce((sum, x) => sum + x.valorTotal, 0),
          valorDinheiroTotal: response.data.filter(v => v.formaPagamento === "Dinheiro").reduce((sum, x) => sum + x.valorTotal, 0),
          valorDebitoTotal: response.data.filter(v => v.formaPagamento === "Debito").reduce((sum, x) => sum + x.valorTotal, 0),
          valorCreditoTotal: response.data.filter(v => v.formaPagamento === "Credito").reduce((sum, x) => sum + x.valorTotal, 0),
          valorSunPago: response.data.reduce((sum, x) => sum + x.valorPago, 0),
          valorSunTroco: response.data.reduce((sum, x) => sum + x.valorTroco, 0),
        });

      })
      .catch((e) => {
        console.log(e);
      });
  }

  refreshList() {
    this.retrieveVendas();
  }

  deleteVenda() {
    if (this.state.currentVenda && this.state.currentVenda.uid) {
      VendaService.delete(this.state.currentVenda.uid)
        .then((response: any) => {
          this.setState({
            currentVenda: null,
          });
          this.refreshList();
        })
        .catch((e: Error) => {
          console.log(e);
        });
    }
  }

  updateVenda() {
    if (this.state.currentVenda && this.state.currentVenda.uid) {
      VendaService.edit(
        this.state.currentVenda.uid,
        this.state.currentVenda
      )
        .then((response: any) => {
          this.setState({
            currentVenda: null,
          });
        })
        .catch((e: Error) => {
          console.log(e);
        });
    }
  }

  onChangeStart(value: Dayjs | null) {
    this.setState({
      start: value,
    });
    this.refreshList();
  }

  onChangeEnd(value: Dayjs | null) {
    this.setState({
      end: value,
    });
    this.refreshList();
  }

  onChangeFormaPagamento(event: SelectChangeEvent<string>) {
    const tipo = event.target.value as string;
    var venda = this.state.currentVenda;
    if (venda) {
      venda.formaPagamento = tipo;
      this.setState({
        currentVenda: venda
      });
    }
  }

  onChangeValorPago(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.valueAsNumber <= 0) {
      return;
    }

    var venda = this.state.currentVenda;
    if (venda) {
      venda.valorPago = e.target.valueAsNumber;
      venda.valorTroco = e.target.valueAsNumber - venda.valorTotal;

      this.setState({
        currentVenda: venda,
      });
    }

  }

  setActiveVenda(venda: VendaDTO) {
    this.setState({
      currentVenda: venda
    });
  }

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
              <Box sx={{ mb: 2 }}>
                <NotaFiscalPanel vendaUid={currentVenda.uid ?? null} />
              </Box>
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