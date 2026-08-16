import { Component, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import ProdutoService from "../../services/produto.service";
import ProdutoDTO from "../../types/produto.type";
import {
  Select, MenuItem, SelectChangeEvent,
  Box, Button, FormControl, Grid, InputLabel, Paper, TextField, Typography,
} from "@mui/material";
import CategoriaDTO from "../../types/categoria.type";
import CategoriaService from "../../services/categoria.service";
import PageHeader from "../shell/PageHeader";

type Props = {};

type State = ProdutoDTO & {
    categorias: Array<CategoriaDTO>,
    submitted: boolean
};

export default class AddProduto extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.onChangeUid = this.onChangeUid.bind(this);
        this.onChangeNome = this.onChangeNome.bind(this);
        this.onChangeValor = this.onChangeValor.bind(this);
        this.onChangeTipoMedida = this.onChangeTipoMedida.bind(this);
        this.saveProduto = this.saveProduto.bind(this);
        this.newProduto = this.newProduto.bind(this);
        this.onChangeCategoria = this.onChangeCategoria.bind(this);
        this.onChangeNcm = this.onChangeNcm.bind(this);
        this.onChangeCfop = this.onChangeCfop.bind(this);
        this.onChangeCsosn = this.onChangeCsosn.bind(this);
        this.onChangeUnidadeComercial = this.onChangeUnidadeComercial.bind(this);

        this.state = {
            categorias: [],
            uid: "",
            nome: "",
            valor: 0,
            tipoMedida: "Unidade",
            categoria: "",
            ncm: "",
            cfop: "5102",
            csosn: "102",
            unidadeComercial: "UN",
            submitted: false,
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

    onChangeUid(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            uid: e.target.value
        });
    }

    onChangeNome(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            nome: e.target.value
        });
    }

    onChangeValor(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            valor: e.target.valueAsNumber
        });
    }

    onChangeTipoMedida(event: SelectChangeEvent<string>) {
        const tipo = event.target.value as string;
        this.setState({
            tipoMedida: tipo,
        });
    }

    onChangeCategoria(event: SelectChangeEvent<string>) {
        const categoria = event.target.value as string;
        const categoriaSelecionada = this.state.categorias.find((cat) => cat.uid === categoria);

        this.setState((prevState) => ({
            categoria: categoria,
            ncm: !prevState.ncm && categoriaSelecionada?.ncmPadrao
                ? categoriaSelecionada.ncmPadrao
                : prevState.ncm,
        }));
    }

    onChangeNcm(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            ncm: e.target.value
        });
    }

    onChangeCfop(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            cfop: e.target.value
        });
    }

    onChangeCsosn(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            csosn: e.target.value
        });
    }

    onChangeUnidadeComercial(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            unidadeComercial: e.target.value
        });
    }

    saveProduto() {
        const data: ProdutoDTO = {
            uid: this.state.uid,
            nome: this.state.nome,
            valor: this.state.valor,
            tipoMedida: this.state.tipoMedida,
            categoria: this.state.categoria,
            ncm: this.state.ncm,
            cfop: this.state.cfop,
            csosn: this.state.csosn,
            unidadeComercial: this.state.unidadeComercial,
        };

        ProdutoService.create(data)
            .then((response: any) => {
                this.setState({
                    submitted: true
                });

            })
            .catch((e: Error) => {
                console.log(e);
            });
    }

    newProduto() {
        this.setState({
            uid: "",
            nome: "",
            valor: 0,
            tipoMedida: "Unidade",
            categoria: "",
            ncm: "",
            cfop: "5102",
            csosn: "102",
            unidadeComercial: "UN",
            submitted: false
        });
    }

    render() {
        const { submitted, uid, nome, valor, tipoMedida, categoria, categorias,
            ncm, cfop, csosn, unidadeComercial } = this.state;

        return (
            <div>
                <PageHeader title="Cadastrar produto" />
                <Paper sx={{ p: 3, maxWidth: 500 }}>
                    {submitted ? (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>Produto enviado com sucesso!</Typography>
                            <Button variant="contained" color="primary" onClick={this.newProduto}>
                                Voltar
                            </Button>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Identificador"
                                    required
                                    value={uid}
                                    onChange={this.onChangeUid}
                                    name="uid"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Nome"
                                    required
                                    value={nome}
                                    onChange={this.onChangeNome}
                                    name="nome"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Valor"
                                    type="number"
                                    required
                                    value={valor}
                                    onChange={this.onChangeValor}
                                    name="valor"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel id="tipo-select-label">Tipo de Medida</InputLabel>
                                    <Select
                                        labelId="tipo-select-label"
                                        id="tipo"
                                        label="Tipo de Medida"
                                        value={tipoMedida}
                                        onChange={this.onChangeTipoMedida}
                                    >
                                        <MenuItem value={"Unidade"}>Unidade</MenuItem>
                                        <MenuItem value={"Kilograma"}>Kilograma</MenuItem>
                                        <MenuItem value={"Aleatorio"}>Aleatório</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel id="categoria-select-label">Categoria</InputLabel>
                                    <Select
                                        labelId="categoria-select-label"
                                        id="categoria"
                                        value={categoria}
                                        label="Categoria"
                                        onChange={this.onChangeCategoria}
                                    >
                                        {categorias.map((cat) => (
                                            <MenuItem value={cat.uid} key={cat.uid}>{cat.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="NCM"
                                    required
                                    value={ncm}
                                    onChange={this.onChangeNcm}
                                    name="ncm"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="CFOP"
                                    required
                                    value={cfop}
                                    onChange={this.onChangeCfop}
                                    name="cfop"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="CSOSN"
                                    required
                                    value={csosn}
                                    onChange={this.onChangeCsosn}
                                    name="csosn"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Unidade Comercial"
                                    required
                                    value={unidadeComercial}
                                    onChange={this.onChangeUnidadeComercial}
                                    name="unidadeComercial"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ display: "flex", gap: 1.5 }}>
                                    <Button component={Link} to={"/list_produto/"} variant="outlined" color="secondary">
                                        Voltar
                                    </Button>
                                    <Button onClick={this.saveProduto} variant="contained" color="primary">
                                        Salvar
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </Paper>
            </div>
        );
    }
}