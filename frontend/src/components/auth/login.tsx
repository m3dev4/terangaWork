import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Google } from "../../assets/icons";
import { Link } from "react-router-dom";
import type { Login } from "../../interfaces/authInterface";
import { useLogin } from "../../hooks/useAuth";
import AuthField from "./AuthField";

export default function LoginComponent() {
  const loginMutation = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<Login>({ defaultValues: { email: "", password: "" } });
  return (
    <form noValidate className="auth-form" onSubmit={handleSubmit(data => loginMutation.mutate(data))}>
      <AuthField id="email" type="email" label="Adresse Email" placeholder="nom@exemple.com" autoComplete="email"
        error={errors.email?.message} {...register("email", { required: "L’email est obligatoire." })} />
      <AuthField id="password" type="password" label="Mot de passe" placeholder="••••••••" autoComplete="current-password"
        hint={<Link to="/password-recovery">Mot de passe oublié ?</Link>}
        error={errors.password?.message} {...register("password", { required: "Le mot de passe est obligatoire." })} />
      <Button type="submit" className="auth-submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? <><Loader2 size={18} className="animate-spin" /> Connexion…</> : "Se connecter"}
      </Button>
      <div className="auth-divider">ou</div>
      <button type="button" className="auth-google"><img src={Google} alt="" />Continuer avec Google</button>
    </form>
  );
}
