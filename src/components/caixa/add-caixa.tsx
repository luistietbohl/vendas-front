import { Component, ChangeEvent } from "react";
import CaixaDTO from "../../types/caixa.type";
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/en-gb';
import moment from "moment";
import FormControl from "@mui/material/FormControl/FormControl";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import caixaService from "../../services/caixa.service";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  TextField, InputAdornment, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  InputLabel, Select, MenuItem, SelectChangeEvent, Collapse, Alert,
  Box, Button, Grid, Typography,
} from "@mui/material";
import VendaDTO from "../../types/venda.type";
import LancamentoDTO from "../../types/lancamento.type";
import PageHeader from "../shell/PageHeader";

type Props = {};

type State = CaixaDTO & {
    start: Dayjs | null,
    end: Dayjs | null,
    lancamentos: Array<LancamentoDTO>,
    descricaoLancamento: string,
    tipoLancamento: string,
    valorLancamento: number,
    userLancamento: string,
    vendas: Array<VendaDTO>,
    valorCaixaAnterior: number,
    valorSunTotal: number,
    valorSunPago: number,
    valorSunTroco: number,
    valorPIXTotal: number,
    valorDinheiroTotal: number,
    valorDebitoCreditoTotal: number,
    valorTotalCaixa: number,
    openLancamentoSucess: boolean,
};

export default class AddCaixa extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.fecharCaixa = this.fecharCaixa.bind(this);
        this.abrirCaixa = this.abrirCaixa.bind(this);
        this.onChangeUser = this.onChangeUser.bind(this);
        this.onChangeValorLancamento = this.onChangeValorLancamento.bind(this);
        this.adicionarLancamento = this.adicionarLancamento.bind(this);
        this.finalizaAlert = this.finalizaAlert.bind(this);
        this.onChangeDescricaoLancamento = this.onChangeDescricaoLancamento.bind(this);
        this.onChangeTipoLancamento = this.onChangeTipoLancamento.bind(this);
        this.onChangeUserLancamento = this.onChangeUserLancamento.bind(this);

        this.state = {
            start: dayjs(new Date().toISOString()),
            end: dayjs(new Date().toISOString()),
            lancamentos: [],
            descricaoLancamento: "",
            tipoLancamento: "",
            valorLancamento: 0,
            userLancamento: "",
            openLancamentoSucess: false,
            vendas: [],
            valorCaixaAnterior: 0,
            user: "",
            inicio: null,
            userInicio: null,
            valorInicioDinheiro: null,
            fim: null,
            userFim: null,
            valorFimDinheiro: null,
            valorSunTotal: 0,
            valorSunPago: 0,
            valorSunTroco: 0,
            valorPIXTotal: 0,
            valorDinheiroTotal: 0,
            valorDebitoCreditoTotal: 0,
            valorTotalCaixa: 0,
        };
    }

    componentDidMount() {
        this.retrieveUltimoCaixa();
        this.retrieveCaixa();
    }

    retrieveCaixa() {
        caixaService.get()
            .then((response) => {
                this.setState({
                    uid: response.data.uid,
                });
                this.retrieveVendas();
                this.retrieveLancamentos();
            })
            .catch((e) => {
                console.log(e);
            });
    }

    calculaValorNoCaixa() {
        const lancamentos = this.state.lancamentos;
        const valorAdicionado = lancamentos.filter(v => v.tipo === "Credito")
            .reduce((sum, x) => sum + x.valor, 0);
        const valorRetirado = lancamentos.filter(v => v.tipo === "Debito")
            .reduce((sum, x) => sum + x.valor, 0);
        const valorPagoDinheiro = this.state.vendas.filter(v => v.formaPagamento === "Dinheiro")
            .reduce((sum, x) => sum + x.valorPago, 0);
        const valorNoCaixa = this.state.valorCaixaAnterior + valorAdicionado - valorRetirado - this.state.valorSunTroco + valorPagoDinheiro;

        this.setState({
            valorTotalCaixa: valorNoCaixa,
        });
    }

    retrieveUltimoCaixa() {
        caixaService.last()
            .then((response) => {
                this.setState({
                    valorCaixaAnterior: response.data.valorFimDinheiro ?
                        response.data.valorFimDinheiro : 0,
                });
            })
            .catch((e) => {
                console.log(e);
            });
    }

    retrieveVendas() {
        const id = this.state.uid;

        if (id) {
            caixaService.vendas(id)
                .then((response) => {
                    this.setState({
                        vendas: response.data,
                        valorSunTotal: response.data.reduce((sum, x) => sum + x.valorTotal, 0),
                        valorPIXTotal: response.data.filter(v => v.formaPagamento === "PIX")
                            .reduce((sum, x) => sum + x.valorTotal, 0),
                        valorDinheiroTotal: response.data.filter(v => v.formaPagamento === "Dinheiro")
                            .reduce((sum, x) => sum + x.valorTotal, 0),
                        valorDebitoCreditoTotal: response.data.filter(v => v.formaPagamento === "Debito" || v.formaPagamento === "Credito")
                            .reduce((sum, x) => sum + x.valorTotal, 0),

                        valorSunPago: response.data.reduce((sum, x) => sum + x.valorPago, 0),
                        valorSunTroco: response.data.reduce((sum, x) => sum + x.valorTroco, 0),
                    });
                    this.calculaValorNoCaixa();
                })
                .catch((e) => {
                    console.log(e);
                });
        }
    }

    retrieveLancamentos() {
        const id = this.state.uid;

        if (id) {
            caixaService.lancamentos(id)
                .then((response) => {
                    this.setState({
                        lancamentos: response.data,
                    });
                    this.calculaValorNoCaixa();
                })
                .catch((e) => {
                    console.log(e);
                });
        }
    }

    onChangeUser(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            user: e.target.value,
        });
    }

    onChangeUserLancamento(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            userLancamento: e.target.value,
        });
    }

    abrirCaixa() {
        const data: CaixaDTO = {
            uid: this.state.uid,
            user: this.state.user,
            inicio: this.state.start ? moment(this.state.start.toDate()).format('yyyy-MM-DDTHH:mm:ss') : null,
            userInicio: null,
            valorInicioDinheiro: null,
            fim: null,
            userFim: null,
            valorFimDinheiro: null,

        };
        caixaService.abrir(data)
            .then((response) => {
                this.setState({
                    uid: response.data.uid,
                    valorInicioDinheiro: response.data.valorInicioDinheiro,
                });
            })
            .catch((e) => {
                console.log(e);
            });
    }

    fecharCaixa() {
        const data: CaixaDTO = {
            uid: this.state.uid,
            user: this.state.user,
            inicio: null,
            userInicio: null,
            valorInicioDinheiro: null,
            fim: this.state.end ? moment(this.state.end.toDate()).format('yyyy-MM-DDTHH:mm:ss') : null,
            userFim: null,
            valorFimDinheiro: this.state.valorTotalCaixa,

        };
        caixaService.fechar(data)
            .then((response) => {
                this.setState({
                    uid: null
                });
                this.retrieveUltimoCaixa();
            })
            .catch((e) => {
                console.log(e);
            });
    }

    adicionarLancamento() {
        const data: LancamentoDTO = {
            caixa: this.state.uid ? this.state.uid : "",
            user: this.state.userLancamento,
            create: moment(new Date()).format('yyyy-MM-DDTHH:mm:ss'),
            descricao: this.state.descricaoLancamento,
            tipo: this.state.tipoLancamento,
            valor: this.state.valorLancamento,
        };

        caixaService.lancamento(data)
            .then((response) => {
                this.setState({
                    descricaoLancamento: "",
                    tipoLancamento: "",
                    valorLancamento: 0,
                    userLancamento: "",
                    openLancamentoSucess: true,
                });
                this.retrieveLancamentos();
            })
            .catch((e) => {
                console.log(e);
            });

    }

    onChangeStart(value: Dayjs | null) {
        this.setState({
            start: value,
        });
    }

    onChangeEnd(value: Dayjs | null) {
        this.setState({
            end: value,
        });
    }

    onChangeValorLancamento(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            valorLancamento: e.target.valueAsNumber,
        });
    }

    onChangeDescricaoLancamento(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            descricaoLancamento: e.target.value,
        });
    }

    onChangeTipoLancamento(event: SelectChangeEvent<string>) {
        this.setState({
            tipoLancamento: event.target.value,
        });
    }

    async finalizaAlert() {
        await new Promise(res => setTimeout(res, 5000));
        this.setState({
            openLancamentoSucess: false,
        })
    }

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
                            <Grid item xs={12}>
                                <Grid container spacing={2} alignItems="flex-end">
                                    <Grid item xs={12} sm={3}>
                                        <TextField id="descricaoLancamento" label="Descrição" variant="outlined"
                                            type="text"
                                            fullWidth
                                            value={descricaoLancamento}
                                            onChange={this.onChangeDescricaoLancamento}
                                        />
                                    </Grid>
                                    <Grid item xs={6} sm={2}>
                                        <TextField id="userLancamento" label="Usuário" variant="outlined"
                                            type="text"
                                            fullWidth
                                            value={userLancamento}
                                            onChange={this.onChangeUserLancamento}
                                        />
                                    </Grid>
                                    <Grid item xs={6} sm={2}>
                                        <FormControl fullWidth>
                                            <InputLabel id="tipoLancamento-select-label">Tipo de Lançamento</InputLabel>
                                            <Select
                                                labelId="tipoLancamento-select-label"
                                                id="tipoLancamento"
                                                value={tipoLancamento}
                                                fullWidth
                                                label="Tipo de Lançamento"
                                                onChange={this.onChangeTipoLancamento}
                                            >
                                                <MenuItem value={"Credito"}>Adicionar</MenuItem>
                                                <MenuItem value={"Debito"}>Retirar</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6} sm={2}>
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
                                    <Grid item xs={6} sm={3}>
                                        <Button onClick={this.adicionarLancamento} variant="contained" color="primary">
                                            Adicionar Lançamento
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid item xs={12} md={7}>
                                <Typography variant="h6" sx={{ textAlign: "center", mb: 1 }}>Vendas efetuadas</Typography>
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
                                <Typography variant="h6" sx={{ textAlign: "center", mb: 1 }}>Lançamentos efetuadas</Typography>
                                <TableContainer component={Paper}>
                                    <Table sx={{ minWidth: 450 }} size="small" aria-label="a dense table">
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
                                        <Typography><strong>Valor Inicio:</strong> R$ {valorCaixaAnterior.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Venda PIX:</strong> R$ {valorPIXTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Venda Debito/Credito:</strong> R$ {valorDebitoCreditoTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Venda Dinheiro:</strong> R$ {valorDinheiroTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total Vendas:</strong> R$ {valorSunTotal.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total pago:</strong> R$ {valorSunPago.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total troco:</strong> R$ {valorSunTroco.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Typography><strong>Total no caixa:</strong> R$ {valorTotalCaixa.toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item xs={12}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={3}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
                                            <DateTimePicker
                                                label="Data de inicio"
                                                value={start}
                                                disabled
                                                onChange={(newValue) => this.onChangeStart(newValue)}
                                            />
                                        </LocalizationProvider>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
                                            <DateTimePicker
                                                label="Data de termino"
                                                value={end}
                                                onChange={(newValue) => this.onChangeEnd(newValue)}
                                            />
                                        </LocalizationProvider>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <TextField id="user" label="Usuário" variant="outlined"
                                            type="text"
                                            fullWidth
                                            value={user}
                                            onChange={this.onChangeUser}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Button onClick={this.fecharCaixa} variant="contained" color="primary">
                                            Fechar Caixa
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3}>
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
                            <Grid item xs={12} sm={3}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
                                    <DateTimePicker
                                        label="Data de inicio"
                                        value={start}
                                        onChange={(newValue) => this.onChangeStart(newValue)}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <TextField id="user" label="Usuário" variant="outlined"
                                    type="text"
                                    fullWidth
                                    value={user}
                                    onChange={this.onChangeUser}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Button onClick={this.abrirCaixa} variant="contained" color="primary">
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