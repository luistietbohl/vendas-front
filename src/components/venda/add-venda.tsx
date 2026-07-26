import { Component, ChangeEvent } from "react";
import VendaDTO from "../../types/venda.type";
import ProdutoDTO from "../../types/produto.type";
import ProdutoService from "../../services/produto.service";
import VendaItemDTO from "../../types/vendaItem.type";
import DeleteIcon from '@mui/icons-material/Delete';
import VendaService from "../../services/venda.service";
import { Select, MenuItem, SelectChangeEvent, Collapse, TextField, InputLabel, FormControl, InputAdornment, Autocomplete, Modal } from "@mui/material";
import moment from 'moment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import CategoriaDTO from "../../types/categoria.type";
import CategoriaService from "../../services/categoria.service";
import CaixaService from "../../services/caixa.service";
import logo from "../../logobomcreampretoebranco.png";
import { Grid, Paper, Button, List, ListItem, ListItemText, Typography, Box } from "@mui/material";
import PageHeader from "../shell/PageHeader";
import NotaFiscalPanel from "./nota-fiscal-panel";

type Props = {};

type State = VendaDTO & {
    produtos: Array<ProdutoDTO>,
    vendasEmAberto: Array<VendaDTO>,
    currentItem: VendaItemDTO | null,
    produtoID: string,
    produtoNome: string | null,
    categorias: Array<CategoriaDTO>,
    open: boolean,
    msg: string,
    openModel: boolean,
    lastVendaUid: string | null,
};

export default class AddVenda extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.retrieveProdutos = this.retrieveProdutos.bind(this);
        this.newVenda = this.newVenda.bind(this);
        this.adicionarItem = this.adicionarItem.bind(this)
        this.onChangeQuantidade = this.onChangeQuantidade.bind(this);
        this.onChangeValorItem = this.onChangeValorItem.bind(this);
        this.finalizarVenda = this.finalizarVenda.bind(this);
        this.removeItem = this.removeItem.bind(this);
        this.onChangeFormaPagamento = this.onChangeFormaPagamento.bind(this);
        this.onChangeValorPago = this.onChangeValorPago.bind(this);
        this.handleChangeProduto = this.handleChangeProduto.bind(this);
        this.finalizaAlert = this.finalizaAlert.bind(this);
        this.pagamentoPendente = this.pagamentoPendente.bind(this);
        this.setActiveVenda = this.setActiveVenda.bind(this);
        this.onChangeCliente = this.onChangeCliente.bind(this);
        this.imprimir = this.imprimir.bind(this);
        this.onPressEnterItem = this.onPressEnterItem.bind(this);
        this.onPressEnterPago = this.onPressEnterPago.bind(this);
        this.handleChangeProdutoOculto = this.handleChangeProdutoOculto.bind(this);
        this.handleClose = this.handleClose.bind(this);

        this.state = {
            caixa: null,
            itens: [],
            vendasEmAberto: [],
            valorDesconto: 0,
            valorTotal: 0,
            produtos: [],
            currentItem: null,
            create: "",
            formaPagamento: "Dinheiro",
            valorPago: 0,
            valorTroco: 0,
            produtoID: "",
            cliente: "",
            produtoNome: null,
            open: false,
            msg: "",
            openModel: false,
            categorias: [],
            lastVendaUid: null,
        };
    }

    componentDidMount() {
        this.retrieveCaixa()
        this.retrieveCategorias()
        this.retrieveProdutos();
        let pendentes = localStorage.getItem("pendentes");
        if (pendentes) {
            this.setState({
                vendasEmAberto: JSON.parse(pendentes),
            });
        }
    }

    retrieveCaixa() {
        CaixaService.get()
            .then((response) => {
                this.setState({
                    caixa: response.data.uid ? response.data.uid : "",
                });
            })
            .catch((e) => {
                console.log(e);
            });
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

    retrieveProdutos() {
        ProdutoService.getAll()
            .then((response) => {
                this.setState({
                    produtos: response.data,
                });
            })
            .catch((e) => {
                console.log(e);
            });
    }

    onChangeQuantidade(e: ChangeEvent<HTMLInputElement>) {
        const item = this.state.currentItem;
        if (item) {
            if (e.target.valueAsNumber <= 0 && item.produto.tipoMedida === "Unidade") {
                return;
            }
            if (e.target.valueAsNumber < 0 && item.produto.tipoMedida === "Kilograma") {
                return;
            }
            item.quantidade = e.target.valueAsNumber;
            item.valorItem = new Number((item.produto.valor * item.quantidade).toFixed(2)).valueOf();
        }
        this.setState({
            currentItem: item,
        });
    }

    onPressEnterItem(e: any) {
        if (e.key === 'Enter') {
            this.adicionarItem();
        }
    }

    onChangeValorItem(e: ChangeEvent<HTMLInputElement>) {
        const item = this.state.currentItem;
        if (item) {
            if (e.target.valueAsNumber < 0 && item.produto.tipoMedida === "Aleatorio") {
                return;
            }
            item.valorItem = e.target.valueAsNumber;
            item.quantidade = 1;
        }
        this.setState({
            currentItem: item,
        });
    }

    adicionarItem() {
        if (this.state.currentItem != null) {
            if (!this.state.currentItem.quantidade || this.state.currentItem.quantidade <= 0 ||
                !this.state.currentItem.valorItem || this.state.currentItem.valorItem <= 0) {
                return;
            }
        }

        const list = this.state.itens;
        const startingNewCart = list.length === 0;
        const cliente = list.length > 0 ? this.state.cliente : "";
        if (this.state.currentItem) {
            var item = list.find((item) => item.produto.uid === this.state.currentItem?.produto.uid);
            if (item && item.produto.tipoMedida === "Unidade") {
                item.quantidade = item.quantidade + this.state.currentItem.quantidade;
                item.valorItem = new Number((item.produto.valor * item.quantidade).toFixed(2)).valueOf();
            } else {
                list.push(this.state.currentItem);
            }
        }

        const sum = list.reduce((sum, x) => sum + x.valorItem, 0);

        this.setState({
            itens: list,
            valorTotal: new Number(sum.toFixed(2)).valueOf(),
            valorPago: new Number(sum.toFixed(2)).valueOf(),
            valorTroco: 0,
            cliente: cliente,
            currentItem: null,
            produtoID: "",
            produtoNome: null,
            lastVendaUid: startingNewCart ? null : this.state.lastVendaUid,
        });
    }

    removeItem(index: number, item: VendaItemDTO) {
        const list = this.state.itens;
        const valorTotal = this.state.valorTotal - item.valorItem;

        list.splice(index, 1);
        this.setState({
            itens: list,
            valorTotal: valorTotal,
            valorPago: valorTotal,
            valorTroco: 0,
        })
    }

    onChangeFormaPagamento(event: SelectChangeEvent<string>) {
        const tipo = event.target.value as string;
        const valorTotal = this.state.valorTotal;
        this.setState({
            formaPagamento: tipo,
            valorPago: valorTotal,
            valorTroco: 0,
        });
    }

    onChangeValorPago(e: ChangeEvent<HTMLInputElement>) {
        if (e.target.valueAsNumber <= 0) {
            return;
        }
        const valorTotal = this.state.valorTotal;
        this.setState({
            valorPago: e.target.valueAsNumber,
            valorTroco: e.target.valueAsNumber - valorTotal,
        });
    }

    onChangeCliente(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            cliente: e.target.value,
        });

    }

    onPressEnterPago(e: any) {
        if (e.key === 'Enter') {
            this.finalizarVenda();
        }
    }

    finalizarVenda() {
        if (!this.state.valorPago || this.state.valorPago <= 0) {
            this.setState({
                open: true,
                msg: "Valor Pago deve ser maior que zero",
            });
            return;
        }

        const stringDate = moment(new Date()).format('yyyy-MM-DDTHH:mm:ss');
        const data: VendaDTO = {
            caixa: this.state.caixa,
            itens: this.state.itens,
            valorDesconto: this.state.valorDesconto,
            valorTotal: this.state.valorTotal,
            create: stringDate,
            formaPagamento: this.state.formaPagamento,
            valorPago: this.state.valorPago,
            valorTroco: this.state.valorTroco,
            cliente: this.state.cliente
        };

        VendaService.create(data)
            .then((response: any) => {
                this.setState({
                    open: true,
                    msg: "Venda registrada com sucesso!",
                    lastVendaUid: response.data.uid ?? null,
                });

            })
            .catch((e: Error) => {
                console.log(e);
            });
        this.newVenda();
    }

    setActiveVenda(venda: VendaDTO, index: number) {
        const list = this.state.vendasEmAberto;
        list.splice(index, 1);

        if (this.state.itens && this.state.itens.length > 0) {
            const data: VendaDTO = {
                caixa: this.state.caixa,
                itens: this.state.itens,
                valorDesconto: this.state.valorDesconto,
                valorTotal: this.state.valorTotal,
                create: "",
                formaPagamento: this.state.formaPagamento,
                valorPago: this.state.valorPago,
                valorTroco: this.state.valorTroco,
                cliente: this.state.cliente,
            };
            list.push(data);
        }

        let obj = JSON.stringify(list);
        localStorage.setItem("pendentes", obj);

        this.setState({
            vendasEmAberto: list,
            formaPagamento: venda.formaPagamento,
            itens: venda.itens,
            valorDesconto: venda.valorDesconto,
            valorTotal: venda.valorTotal,
            valorPago: venda.valorPago,
            valorTroco: venda.valorTroco,
            cliente: venda.cliente,
        });

    }

    pagamentoPendente() {
        const data: VendaDTO = {
            caixa: this.state.caixa,
            itens: this.state.itens,
            valorDesconto: this.state.valorDesconto,
            valorTotal: this.state.valorTotal,
            create: "",
            formaPagamento: this.state.formaPagamento,
            valorPago: isNaN(this.state.valorPago) ? 0: this.state.valorPago,
            valorTroco: isNaN(this.state.valorTroco) ? 0: this.state.valorTroco,
            cliente: this.state.cliente,
        };

        const list = this.state.vendasEmAberto;

        list.push(data);

        let obj = JSON.stringify(list);
        localStorage.setItem("pendentes", obj);

        this.setState({
            vendasEmAberto: list,
        });
        this.newVenda();
    }

    async finalizaAlert() {
        await new Promise(res => setTimeout(res, 5000));
        this.setState({
            open: false,
        })
    }

    handleChangeProdutoOculto(event: any, value: string | null) {
        if (!value) {
            this.setState({
                produtoID: "",
                produtoNome: value,
                currentItem: null,
            });
            return;
        }
        var prod = null;
        for (let i = 0; i < this.state.produtos.length; i++) {
            if (this.state.produtos[i].nome === value) {
                prod = this.state.produtos[i];
                break;
            }
        }

        if (prod) {
            const item = {
                produto: prod,
                quantidade: prod.tipoMedida === "Kilograma" ? 0 : 1,
                valorItem: prod.tipoMedida === "Kilograma" ? 0 : prod.valor,
            };
            this.setState({
                currentItem: item,
                produtoID: "",
                produtoNome: value,
                openModel: true,
            });
        }
    }

    handleChangeProduto(event: React.MouseEvent<HTMLElement>,
        idProduto: string) {
        var prod = null;
        for (let i = 0; i < this.state.produtos.length; i++) {
            if (this.state.produtos[i].uid === idProduto) {
                prod = this.state.produtos[i];
                break;
            }
        }

        if (prod) {
            const item = {
                produto: prod,
                quantidade: prod.tipoMedida === "Kilograma" ? 0 : 1,
                valorItem: prod.tipoMedida === "Kilograma" ? 0 : prod.valor,
            };
            this.setState({
                currentItem: item,
                produtoID: idProduto,
                produtoNome: null,
                openModel: true,
            });
        }
    }

    newVenda() {
        this.setState({
            uid: null,
            itens: [],
            valorDesconto: 0,
            valorTotal: 0,
            formaPagamento: "Dinheiro",
            valorPago: 0,
            valorTroco: 0,
            currentItem: null,
            produtoID: "",
            produtoNome: null,
            lastVendaUid: null,
        });
    }

    imprimir() {
        window.print();
    }

    handleClose() {
        this.setState({
            openModel: false,
            produtoID: "",
            produtoNome: null,
            currentItem: null,
        });
    }

    render() {
        const { produtos, currentItem, itens, valorTotal, formaPagamento, cliente, caixa, openModel,
            valorPago, valorTroco, produtoID, produtoNome, categorias, open, msg, vendasEmAberto } = this.state;

        return (
            <Box sx={{ '& *': { fontWeight: 'bold !important' } }}>
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
                                                        sx={{
                                                            width: "100%", mb: 2, gap: 1,
                                                            '& .MuiToggleButtonGroup-grouped': {
                                                                margin: 0,
                                                                borderRadius: '12px !important',
                                                                border: '2px solid #F6C2E0 !important',
                                                                backgroundColor: '#FFFFFF',
                                                                color: '#0A3A61',
                                                                fontSize: '0.95rem',
                                                                justifyContent: 'flex-start',
                                                                textAlign: 'left',
                                                                py: 1.2,
                                                                px: 2,
                                                                boxShadow: '0 1px 3px rgba(10,58,97,0.12)',
                                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                                                                '&:hover': {
                                                                    backgroundColor: '#F6C2E0 !important',
                                                                    borderColor: '#F0A8CE !important',
                                                                    transform: 'translateY(-1px)',
                                                                    boxShadow: '0 4px 10px rgba(10,58,97,0.18) !important',
                                                                },
                                                                '&.Mui-selected': {
                                                                    backgroundColor: '#0E4F82 !important',
                                                                    borderColor: '#0E4F82 !important',
                                                                    color: '#FFFFFF !important',
                                                                    boxShadow: '0 4px 12px rgba(14,79,130,0.4) !important',
                                                                },
                                                                '&.Mui-selected:hover': {
                                                                    backgroundColor: '#0A3A61 !important',
                                                                    borderColor: '#0A3A61 !important',
                                                                },
                                                            },
                                                        }}
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
                                  <Paper elevation={3} sx={{ p: 3, backgroundColor: 'background.paper' }}>
                                    <Typography variant="h6" sx={{ textAlign: "center" }}>Carrinho de compras</Typography>
                                    <List>
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
                                            <FormControl fullWidth>
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
                                            </FormControl>
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
                                    <Grid container spacing={2} sx={{ mt: 1 }} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <TextField id="valorPago" label="Cliente" variant="outlined"
                                                type="text"
                                                fullWidth
                                                value={cliente}
                                                onChange={this.onChangeCliente}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={8}>
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                                                <Button onClick={this.pagamentoPendente} variant="outlined" color="secondary" size="medium">
                                                    Pagamento pendente
                                                </Button>
                                                <Button onClick={this.finalizarVenda} variant="contained" color="primary" size="medium">
                                                    Finalizar Compra
                                                </Button>
                                                <Button onClick={this.imprimir} variant="contained" color="primary" size="medium">
                                                    Imprimir
                                                </Button>
                                                <NotaFiscalPanel vendaUid={this.state.lastVendaUid} />
                                            </Box>
                                        </Grid>
                                    </Grid>
                                  </Paper>
                                </Grid>
                            ) : (
                                <Grid item xs={12} md={6}>
                                  <Paper elevation={3} sx={{ p: 3, backgroundColor: 'background.paper' }}>
                                    <Typography variant="h6" sx={{ textAlign: "center" }}>Carrinho de compras</Typography>
                                    <List>
                                        <ListItem>
                                            <ListItemText primary="Sem itens adicionados" />
                                        </ListItem>
                                    </List>
                                  </Paper>
                                </Grid>
                            )}
                            <div className="printme">
                                <img src={logo} alt={"logo"} />
                                <h1 className="titulo-central" style={{ fontWeight: '600' }}>Compras</h1>
                                <ul className="list-group">
                                    <li className="list-group-item">
                                        <div className="row">
                                            <div className="col-5"><strong>Produto</strong></div>
                                            <div className="col-1 custom-div-center"><strong>Quant</strong></div>
                                            <div className="col-3 custom-div-valor"><strong>Total</strong></div>
                                        </div>
                                    </li>
                                    {itens.map((item, index) => (
                                        <li className="list-group-item" key={index}>
                                            <div className="row">
                                                <div className="col-5">{item.produto.nome}</div>
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
                                <Grid item xs={12} className="no-printme">
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
            </Box>
        )
    }
}