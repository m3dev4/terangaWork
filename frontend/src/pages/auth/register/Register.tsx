import { Link } from "react-router-dom";
import AuthTitleDesc from "../../../components/auth/authTitleDesc";
import RegisterComponent from "../../../components/auth/register";

export default function Register() {
  return (
    <>
      <AuthTitleDesc
        title="Créez votre"
        span="compte"
        description={
          <>
            Déjà un compte ? <Link to="/login">Se connecter</Link>
          </>
        }
      />
      <RegisterComponent />
    </>
  );
}
