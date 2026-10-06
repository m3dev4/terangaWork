import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Google } from "../../assets/icons";
import type { Register } from "../../interfaces/authInterface";
import { useRegister } from "../../hooks/useAuth";
import AuthField from "./AuthField";

export default function RegisterComponent() {
  const registerMutation = useRegister();
  const { register, handleSubmit, formState: { errors } } = useForm<Register>({ defaultValues: { email: "", password: "", confirmPassword: "" } });
  return (
    <form noValidate className="auth-form" onSubmit={handleSubmit(data => registerMutation.mutate(data))}>
      <AuthField id="email" type="email" label="Adresse Email" placeholder="nom@exemple.com" autoComplete="email"
        error={errors.email?.message} {...register("email", { required: "L’email est obligatoire." })} />
      <AuthField id="password" type="password" label="Mot de passe" placeholder="••••••••" autoComplete="new-password"
        error={errors.password?.message} {...register("password", { required: "Le mot de passe est obligatoire." })} />
      <AuthField id="confirmPassword" type="password" label="Confirmer le mot de passe" placeholder="••••••••" autoComplete="new-password"
        error={errors.confirmPassword?.message} {...register("confirmPassword", { required: "La confirmation est obligatoire." })} />
      <Button type="submit" className="auth-submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? <><Loader2 size={18} className="animate-spin" /> Création…</> : "Créer mon compte"}
      </Button>
      <div className="auth-divider">ou</div>
      <button type="button" className="auth-google"><img src={Google} alt="" />Continuer avec Google</button>
    </form>
  );
}
