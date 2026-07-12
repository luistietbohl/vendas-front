import { ChangeEvent, Component } from "react";
import authService from "../../auth/auth.service";
import logo from "../../logo_bomcream.png";


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
            <div>
                <h2>Sistema de vendas!</h2>
                {currentUser ? (
                    <div className="custom-div-center">
                        <img src={logo} alt={"logo"} style={{ width: '50%' }} />
                        <h1>Serviço de vendas!</h1>
                    </div>
                ) : (
                    <div className="submit-form">
                        <div className="form-group">
                            <label htmlFor="login">Login</label>
                            <input
                                type="text"
                                className="form-control"
                                id="login"
                                required
                                value={login}
                                onChange={this.onChangeLogin}
                                name="login"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="pass">Senha</label>
                            <input
                                type="password"
                                className="form-control"
                                id="pass"
                                required
                                value={pass}
                                onChange={this.onChangePass}
                                onKeyPress={this.onPressEnter}
                                name="pass"
                            />
                        </div>
                        <button onClick={this.login} className="btn btn-success">
                            Login
                        </button>
                    </div>
                )}
            </div>
        )
    }
}

export default Login;