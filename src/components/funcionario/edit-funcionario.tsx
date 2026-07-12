import { Component, ChangeEvent } from "react";
import { RouteComponentProps } from 'react-router-dom';
import {
  Select, MenuItem, SelectChangeEvent, Tabs, Tab, TextField, InputAdornment,
  Box, Button, FormControl, Grid, InputLabel, Paper, Typography,
} from "@mui/material";

import FuncionarioService from "../../services/funcionario.service";
import FuncionarioDTO from "../../types/funcionario.type";
import AnoTrabalhoDTO from "../../types/anotrabalho.type";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
import PageHeader from "../shell/PageHeader";

interface RouterProps {
  id: string;
}

type Props = RouteComponentProps<RouterProps>;

type State = {
  currentFuncionario: FuncionarioDTO,
  anoMes: AnoTrabalhoDTO,
  currentAno: number,
  newAno: number,
  aba: string,
  message: string;
}

export default class EditFuncionario extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.onChangeNome = this.onChangeNome.bind(this);
    this.onChangeValor = this.onChangeValor.bind(this);
    this.onChangeAno = this.onChangeAno.bind(this);
    this.onChangeNovoAno = this.onChangeNovoAno.bind(this);
    this.getFuncionario = this.getFuncionario.bind(this);
    this.updateFuncionario = this.updateFuncionario.bind(this);
    this.addNewAno = this.addNewAno.bind(this);
    this.deleteFuncionario = this.deleteFuncionario.bind(this);
    this.voltarLista = this.voltarLista.bind(this);
    this.onChangeHoraInicio1 = this.onChangeHoraInicio1.bind(this);
    this.onChangeHoraFim1 = this.onChangeHoraFim1.bind(this);
    this.onChangeHoraInicio2 = this.onChangeHoraInicio2.bind(this);
    this.onChangeHoraFim2 = this.onChangeHoraFim2.bind(this);
    this.onChangeValorVale = this.onChangeValorVale.bind(this);
    this.calculaValorHora = this.calculaValorHora.bind(this);

    this.state = {
      currentFuncionario: {
        cpf: null,
        nome: "",
        valorHora: 0,
        anos: [],
      },
      anoMes: {
        ano: 0,
        meses: [],
      },
      currentAno: 0,
      newAno: 0,
      aba: "",
      message: "",
    }
  }

  componentDidMount() {
    this.getFuncionario(this.props.match.params.id);
  }

  onChangeNome(e: ChangeEvent<HTMLInputElement>) {
    const nome = e.target.value;
    this.setState(function (prevState) {
      return {
        currentFuncionario: {
          ...prevState.currentFuncionario,
          nome: nome,
        },
      };
    });
  }

  onChangeValor(e: ChangeEvent<HTMLInputElement>) {
    const valor = e.target.valueAsNumber;
    this.setState(function (prevState) {
      return {
        currentFuncionario: {
          ...prevState.currentFuncionario,
          valorHora: valor,
        },
      };
    });
  }

  onChangeAno(event: SelectChangeEvent<number>) {
    const ano = event.target.value as number;
    
    this.setState({
      currentAno: ano,
      anoMes: this.state.currentFuncionario.anos.find((a : AnoTrabalhoDTO) => a.ano == ano) as AnoTrabalhoDTO,
    });
  }

  onChangeNovoAno(e: ChangeEvent<HTMLInputElement>) {
    const valor = e.target.valueAsNumber;
    this.setState({
      newAno: valor,
    });
  }

  onChangeHoraInicio1(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, mes: number, dia: number) {
    const tmp = this.state.anoMes;
    tmp.meses[mes-1].dias[dia-1].horaInicio1 = e.target.value;
    this.calculaValorHora(tmp, mes, dia);
    this.setState({
      anoMes: tmp,
    });
  }

  onChangeHoraFim1(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, mes: number, dia: number) {
    const tmp = this.state.anoMes;
    tmp.meses[mes-1].dias[dia-1].horaFim1 = e.target.value;
    this.calculaValorHora(tmp, mes, dia);
    this.setState({
      anoMes: tmp,
    });
  }

  onChangeHoraInicio2(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, mes: number, dia: number) {
    const tmp = this.state.anoMes;
    tmp.meses[mes-1].dias[dia-1].horaInicio2 = e.target.value;
    this.calculaValorHora(tmp, mes, dia);
    this.setState({
      anoMes: tmp,
    });
  }

  onChangeHoraFim2(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, mes: number, dia: number) {
    const tmp = this.state.anoMes;
    tmp.meses[mes-1].dias[dia-1].horaFim2 = e.target.value;
    this.calculaValorHora(tmp, mes, dia);
    this.setState({
      anoMes: tmp,
    });
  }

  onChangeValorVale(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, mes: number, dia: number) {
    const tmp = this.state.anoMes;
    tmp.meses[mes-1].dias[dia-1].valorVale = +e.target.value;
    this.calculaValorHora(tmp, mes, dia);
    this.setState({
      anoMes: tmp,
    });
  }

  calculaValorHora(tmp: AnoTrabalhoDTO, mes: number, dia: number) {
    var valor = this.state.currentFuncionario.valorHora;
    var h1 = tmp.meses[mes-1].dias[dia-1].horaInicio1;
    var h2 = tmp.meses[mes-1].dias[dia-1].horaFim1;
    var h3 = tmp.meses[mes-1].dias[dia-1].horaInicio2;
    var h4 = tmp.meses[mes-1].dias[dia-1].horaFim2;
    var vale = tmp.meses[mes-1].dias[dia-1].valorVale;
    var totalTrabalho: number = 0;
    if (h1 != null && h1.length > 4 && h2 != null && h2.length > 4) {
      var hm1 = h1.split(":");
      var hm2 = h2.split(":");
      var m2 = (+hm2[0])*60+(+hm2[1]);
      var m1= (+hm1[0])*60+(+hm1[1]);
      var mt =m2-m1;
      totalTrabalho = mt*valor/60;
    } 
    if (h3 != null && h3.length > 4 && h4 != null && h4.length > 4) {
      var hm1 = h3.split(":");
      var hm2 = h4.split(":");
      var m2 = (+hm2[0])*60+(+hm2[1]);
      var m1= (+hm1[0])*60+(+hm1[1]);
      var mt =m2-m1;
      totalTrabalho = totalTrabalho + mt*valor/60;
    }
    var totalDia: number = totalTrabalho;
    if (vale != null && vale > 0) {
      totalDia = totalDia - vale;
    }
    tmp.meses[mes-1].dias[dia-1].valorTrabalho = totalTrabalho;
    tmp.meses[mes-1].dias[dia-1].valorTotalDia = totalDia;
    tmp.meses[mes-1].valorMes = tmp.meses[mes-1].dias.map(d => d.valorTotalDia).reduce((prev, next) => prev + next);
  }


  handleChangeAba = (e: React.SyntheticEvent, newValue: string) => {
    this.setState({
        aba: newValue
    });
};

  getFuncionario(id: string) {
    FuncionarioService.get(id)
      .then((response: any) => {
        var ano = response.data.anos.find((a : AnoTrabalhoDTO) => a.ano == new Date().getFullYear());
        if (ano === undefined){
          FuncionarioService.addAno(response.data.cpf, new Date().getFullYear())
          .then((response: any) => {
            ano = response.data.anos[response.data.anos.length - 1];
            this.setState({
              currentFuncionario: response.data,
              currentAno: 2025,
              anoMes: response.data.anos[response.data.anos.length - 1],
              aba: (new Date().getMonth() + 1).toString(),
            });
          })
          .catch((e: Error) => {
            console.log(e);
          });
        } else {
          this.setState({
            currentFuncionario: response.data,
            currentAno: new Date().getFullYear(),
            anoMes: response.data.anos.find((a : AnoTrabalhoDTO) => a.ano == new Date().getFullYear()),
            aba: (new Date().getMonth() + 1).toString(),
          });
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  updateFuncionario() {
    FuncionarioService.edit(
      this.state.currentFuncionario.cpf,
      this.state.currentFuncionario
    )
      .then((response: any) => {

        this.setState({
          message: "Sucesso ao alterar o funcionario!",
        });
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  addNewAno() {
    FuncionarioService.addAno(this.state.currentFuncionario.cpf, this.state.newAno)
      .then((response: any) => {
        this.setState({
          message: "Sucesso ao adicionar novo ano funcionario!",
          currentFuncionario: response.data,
          currentAno: this.state.newAno,
          anoMes: response.data.anos[response.data.anos.length - 1],
          aba: "1",
        });
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  deleteFuncionario() {
    FuncionarioService.delete(this.state.currentFuncionario.cpf)
      .then((response: any) => {

        this.voltarLista();
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  voltarLista() {
    this.props.history.push("/list_funcionario");
  }

  render() {
    const { currentFuncionario, currentAno, anoMes, aba, newAno } = this.state;

    return (
      <div>
        {currentFuncionario ? (
          <div>
            <PageHeader title="Editar Funcionario" />
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Identificador"
                    id="identificador"
                    value={currentFuncionario.cpf}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome"
                    id="nome"
                    value={currentFuncionario.nome}
                    onChange={this.onChangeNome}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Valor Hora"
                    id="valorHora"
                    type="number"
                    value={currentFuncionario.valorHora}
                    onChange={this.onChangeValor}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel id="ano-select-label">Ano</InputLabel>
                    <Select
                      labelId="ano-select-label"
                      id="ano"
                      value={currentAno}
                      label="Ano"
                      onChange={this.onChangeAno}
                    >
                      {currentFuncionario.anos.map((ano) => (
                        <MenuItem value={ano.ano} key={ano.ano}>{ano.ano}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
                <TabContext value={aba}>
                  <Box sx={{ mt: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Tabs value={aba} onChange={this.handleChangeAba}>
                            {anoMes.meses.map((mes) => (
                                <Tab id={mes.numero.toString()} label={mes.mes} value={mes.numero.toString()} key={mes.numero} />
                            ))}
                    </Tabs>
                  </Box>
                    {anoMes.meses.map((mes) => (
                        <TabPanel value={mes.numero.toString()} key={mes.numero} sx={{ px: 0 }}>
                          <Grid container spacing={1} sx={{ mt: 1 }}>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={3}></Grid>
                            <Grid item xs={2}><Typography fontWeight={700}>Valor Trabalhado</Typography></Grid>
                            <Grid item xs={2}><Typography fontWeight={700}>Valor dia</Typography></Grid>
                          </Grid>
                          {mes.dias.map((dia) => (
                            <Grid container spacing={1} alignItems="center" sx={{ mt: 0.5 }} key={dia.dia}>
                              <Grid item xs={1}>
                                <Typography>{dia.dia}</Typography>
                              </Grid>
                              <Grid item xs={1}>
                                <TextField id="inicio1" label="Inicio" variant="outlined"
                                                            type="time"
                                                            focused={true}
                                                            value={dia.horaInicio1}
                                                            onChange={(e) => {this.onChangeHoraInicio1(e, mes.numero, dia.dia)}}
                                                        />
                              </Grid>
                              <Grid item xs={1}>
                                <TextField id="fim1" label="Fim" variant="outlined"
                                                            type="time"
                                                            focused={true}
                                                            value={dia.horaFim1}
                                                            onChange={(e) => {this.onChangeHoraFim1(e, mes.numero, dia.dia)}}
                                                        />
                              </Grid>
                              <Grid item xs={1}>
                                <TextField id="incio2" label="Inicio" variant="outlined"
                                                            type="time"
                                                            focused={true}
                                                            value={dia.horaInicio2}
                                                            onChange={(e) => {this.onChangeHoraInicio2(e, mes.numero, dia.dia)}}
                                                        />
                              </Grid>
                              <Grid item xs={1}>
                                <TextField id="fim2" label="Fim" variant="outlined"
                                                            type="time"
                                                            focused={true}
                                                            value={dia.horaFim2}
                                                            onChange={(e) => {this.onChangeHoraFim2(e, mes.numero, dia.dia)}}
                                                        />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField id="valorVale" label="Valor Vale" variant="outlined"
                                                            type="number"
                                                            value={dia.valorVale}
                                                            onChange={(e) => {this.onChangeValorVale(e, mes.numero, dia.dia)}}
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                                            }}
                                                        />
                              </Grid>
                              <Grid item xs={2}>
                                <Typography>R$ {dia.valorTrabalho.toLocaleString('pt-br',
                                  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                              </Grid>
                              <Grid item xs={2}>
                                <Typography color={dia.valorTotalDia < 0 ? "error" : "inherit"}>
                                  R$ {dia.valorTotalDia.toLocaleString('pt-br',
                                    { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Typography>
                              </Grid>
                            </Grid>
                          ))}
                          <Typography sx={{ mt: 2 }} color={mes.valorMes < 0 ? "error" : "inherit"} fontWeight={700}>
                            Valor total no mes: R$ {mes.valorMes.toLocaleString('pt-br',
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TabPanel>
                    ))}
                </TabContext>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Novo Ano"
                    id="novoAno"
                    type="number"
                    value={newAno}
                    onChange={this.onChangeNovoAno}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Button variant="contained" color="primary" onClick={this.addNewAno}>
                    Adicionar Novo Ano
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" onClick={this.voltarLista}>
                Voltar
              </Button>
              <Button variant="outlined" color="error" onClick={this.deleteFuncionario}>
                Remover
              </Button>
              <Button variant="contained" color="primary" onClick={this.updateFuncionario}>
                Atualizar
              </Button>
            </Box>
            {this.state.message && <Typography sx={{ mt: 2 }}>{this.state.message}</Typography>}
          </div>
        ) : (
          <Typography sx={{ p: 2 }}>Selecione um funcionario...</Typography>
        )}
      </div>
    );
  }
}
