import { Component, ChangeEvent } from "react";
import { Link, RouteComponentProps } from "react-router-dom";
import FuncionarioService from "../../services/funcionario.service";
import FuncionarioDTO from "../../types/funcionario.type";
import { Box, Button, Grid, Paper, TextField, Typography } from "@mui/material";
import PageHeader from "../shell/PageHeader";

interface RouterProps {
    id: string;
}

type Props = RouteComponentProps<RouterProps>;

type State = FuncionarioDTO & {
    submitted: boolean,
};

export default class AddFuncionario extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.onChangeUid = this.onChangeUid.bind(this);
        this.onChangeNome = this.onChangeNome.bind(this);
        this.onChangeValor = this.onChangeValor.bind(this);
        this.saveFuncionario = this.saveFuncionario.bind(this);
        this.newFuncionario = this.newFuncionario.bind(this);

        this.state = {
            cpf: "",
            nome: "",
            valorHora: 0,
            anos: [],
            submitted: false,
        };
    }

    onChangeUid(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            cpf: e.target.value
        });
    }

    onChangeNome(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            nome: e.target.value
        });
    }

    onChangeValor(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            valorHora: e.target.valueAsNumber
        });
    }

    saveFuncionario() {
        const data: FuncionarioDTO = {
            cpf: this.state.cpf,
            nome: this.state.nome,
            valorHora: this.state.valorHora,
            anos: [],
        };

        FuncionarioService.create(data)
            .then((response: any) => {
                this.setState({
                    submitted: true,
                });
                this.props.history.push("/list_funcionario/" + response.data.cpf);
            })
            .catch((e: Error) => {
                console.log(e);
            });
    }

    newFuncionario() {
        this.setState({
            cpf: "",
            nome: "",
            valorHora: 0,
            anos: [],
            submitted: false
        });
    }

    render() {
        const { submitted, cpf, nome, valorHora } = this.state;

        return (
            <div>
                <PageHeader title="Cadastrar Funcionario" />
                <Paper sx={{ p: 3, maxWidth: 500 }}>
                    {submitted ? (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>Funcionario enviado com sucesso!</Typography>
                            <Button variant="contained" color="primary" onClick={this.newFuncionario}>
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
                                    value={cpf}
                                    onChange={this.onChangeUid}
                                    name="cpf"
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
                                    label="Valor hora"
                                    type="number"
                                    required
                                    value={valorHora}
                                    onChange={this.onChangeValor}
                                    name="ordem"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ display: "flex", gap: 1.5 }}>
                                    <Button component={Link} to={"/list_funcionario/"} variant="outlined" color="secondary">
                                        Voltar
                                    </Button>
                                    <Button onClick={this.saveFuncionario} variant="contained" color="primary">
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