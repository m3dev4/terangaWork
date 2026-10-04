import { Link } from "react-router-dom";
import AuthTitleDesc from "../../../components/auth/authTitleDesc";
import LoginComponent from "../../../components/auth/login";

export default function Login() {
  return <><AuthTitleDesc title="Se connecter à votre" span="compte"
    description={<>Pas encore de compte ? <Link to="/register">S’inscrire</Link></>} /><LoginComponent /></>;
}
