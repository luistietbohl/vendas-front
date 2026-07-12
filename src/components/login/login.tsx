import { ChangeEvent, Component } from "react";
import authService from "../../auth/auth.service";
import logo from "../../logo_bomcream.png";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { brandFont } from "../../theme";


type Props = {};

type State = {
    login: string,
    pass: string,
    currentUser: string | null
}

class Login extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.onChangeLogin = this.onChangeLogin.bind(this);
        this.onChangePass = this.onChangePass.bind(this);
        this.login = this.login.bind(this);
        this.onPressEnter = this.onPressEnter.bind(this);

        this.state = {
            login: "",
            pass: "",
            currentUser: null,
        };
    }

    componentDidMount() {
        const user = authService.getCurrentUser();

        if (user) {
            this.setState({
                currentUser: user,
            });
        }
    }

    onChangeLogin(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            login: e.target.value,
        });
    }

    onChangePass(e: ChangeEvent<HTMLInputElement>) {
        this.setState({
            pass: e.target.value,
        });
    }

    login() {
        authService.login(this.state.login, this.state.pass).then(
            retorno => {
                this.setState({
                    currentUser: retorno
                });;
                window.location.replace("/");
            }
        );
    }

    onPressEnter(e: any) {
        if (e.key === 'Enter') {
            this.login();
        }
    }

    render() {
        const { currentUser, login, pass } = this.state;
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 2, md: 6 } }}>
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        maxWidth: 380,
                        width: "100%",
                        borderRadius: "32px",
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ fontFamily: brandFont, fontSize: 32, color: "primary.dark", mb: 1 }}>
                        Bom Cream
                    </Typography>
                    <Typography sx={{ mb: 3 }}>Sistema de vendas</Typography>
                    {currentUser ? (
                        <Box>
                            <img src={logo} alt={"logo"} style={{ width: '80%' }} />
                            <Typography variant="h6" sx={{ mt: 2 }}>Serviço de vendas!</Typography>
                        </Box>
                    ) : (
                        <Box
                            component="form"
                            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                            onKeyPress={this.onPressEnter}
                        >
                            <TextField
                                id="login"
                                name="login"
                                label="Login"
                                required
                                value={login}
                                onChange={this.onChangeLogin}
                            />
                            <TextField
                                id="pass"
                                name="pass"
                                label="Senha"
                                type="password"
                                required
                                value={pass}
                                onChange={this.onChangePass}
                            />
                            <Button variant="contained" color="primary" onClick={this.login}>
                                Login
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>
        )
    }
}

export default Login;