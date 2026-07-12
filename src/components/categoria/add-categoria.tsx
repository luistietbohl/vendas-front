import { Component, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import CategoriaService from "../../services/categoria.service";
import {
  Select, MenuItem, SelectChangeEvent,
  Box, Button, FormControl, Grid, InputLabel, Paper, TextField, Typography,
} from "@mui/material";
import CategoriaDTO from "../../types/categoria.type";
import PageHeader from "../shell/PageHeader";

type Props = {};

type State = CategoriaDTO & {
    submitted: boolean
};

export default class AddCategoria extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.onChangeUid = this.onChangeUid.bind(this);
        this.onChangeNome = this.onChangeNome.bind(this);
        this.onChangeOrdem = this.onChangeOrdem.bind(this);
        this.onChangeTipo = this.onChangeTipo.bind(this);
        this.saveCategoria = this.saveCategoria.bind(this);
        this.newCategoria = this.newCategoria.bind(this);

        this.state = {
            uid: "",
            nome: "",
            ordem: 0,
            tipo: "visivel",
            submitted: false,
        };
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

    onChangeOrdem(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            ordem: e.target.valueAsNumber
        });
    }

    onChangeTipo(event: SelectChangeEvent<string>) {
        const tipo = event.target.value as string;
        this.setState({
            tipo: tipo,
        });
    }

    saveCategoria() {
        const data: CategoriaDTO = {
            uid: this.state.uid,
            nome: this.state.nome,
            ordem: this.state.ordem,
            tipo: this.state.tipo,
        };

        CategoriaService.create(data)
            .then((response: any) => {
                this.setState({
                    submitted: true
                });

            })
            .catch((e: Error) => {
                console.log(e);
            });
    }

    newCategoria() {
        this.setState({
            uid: "",
            nome: "",
            ordem: 0,
            tipo: "visivel",
            submitted: false
        });
    }

    render() {
        const { submitted, uid, nome, ordem, tipo } = this.state;

        return (
            <div>
                <PageHeader title="Cadastrar Categoria" />
                <Paper sx={{ p: 3, maxWidth: 500 }}>
                    {submitted ? (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>Categoria enviado com sucesso!</Typography>
                            <Button variant="contained" color="primary" onClick={this.newCategoria}>
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
                                    label="Ordem"
                                    type="number"
                                    required
                                    value={ordem}
                                    onChange={this.onChangeOrdem}
                                    name="ordem"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel id="tipo-select-label">Tipo</InputLabel>
                                    <Select
                                        labelId="tipo-select-label"
                                        id="tipo"
                                        label="Tipo"
                                        value={tipo}
                                        onChange={this.onChangeTipo}
                                    >
                                        <MenuItem value={"visivel"}>Visivel</MenuItem>
                                        <MenuItem value={"oculto"}>Oculto</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ display: "flex", gap: 1.5 }}>
                                    <Button component={Link} to={"/list_categoria/"} variant="outlined" color="secondary">
                                        Voltar
                                    </Button>
                                    <Button onClick={this.saveCategoria} variant="contained" color="primary">
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