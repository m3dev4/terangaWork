import { useForm } from "react-hook-form";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "../ui/button";
import { Google } from "../../assets/icons";
import { Link } from "react-router-dom";
import type { Register } from "../../interfaces/authInterface";
import { useRegister } from "../../hooks/useAuth";
import { useState } from "react";

const RegisterComponent = () => {
  const registerMutation = useRegister();
  const { register, handleSubmit, formState } = useForm<Register>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="flex flex-col items-start justify-start w-full mt-4">
      <form
        noValidate
        className="space-y-4 w-full"
        onSubmit={handleSubmit((data) => registerMutation.mutate(data))}
      >
        <div className="flex flex-col space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs sm:text-sm text-neutral-700 font-medium"
          >
            Adresse Email
          </Label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <Input
              id="email"
              className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#1b4b6b] focus:bg-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg transition-colors placeholder:text-neutral-400"
              placeholder="exemple@test.com"
              type="email"
              {...register("email", { required: "L'email est obligatoire." })}
            />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs sm:text-sm text-neutral-700 font-medium"
          >
            Mot de passe
          </Label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <Input
              id="password"
              className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#1b4b6b] focus:bg-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg transition-colors placeholder:text-neutral-400"
              placeholder="••••••••••••"
              type={showPassword ? "text" : "password"}
              {...register("password", {
                required: "Le mot de passe est obligatoire.",
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="text-xs sm:text-sm text-neutral-700 font-medium"
          >
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <Input
              id="confirmPassword"
              className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#1b4b6b] focus:bg-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg transition-colors placeholder:text-neutral-400"
              placeholder="••••••••••••"
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmPassword", {
                required: "La confirmation est obligatoire.",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full h-11 bg-secondary-terangawork hover:bg-[#e0893a] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm"
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              "S'inscrire"
            )}
          </Button>
          {formState.errors.email && (
            <p className="text-xs text-red-600 mt-1">
              {formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center space-x-3 py-1">
          <div className="flex-1 h-px bg-neutral-200" />
          <p className="text-xs text-neutral-400 font-medium">ou</p>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        <div>
          <button
            type="button"
            className="w-full h-11 bg-white hover:bg-neutral-50 text-neutral-700 font-medium border border-neutral-200 rounded-lg flex items-center justify-center gap-2.5 transition-colors cursor-pointer text-xs sm:text-sm"
          >
            <img src={Google} alt="Google" className="w-4 h-4 object-contain" />
            <span>S'inscrire avec Google</span>
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="text-xs sm:text-sm text-neutral-500">
            Déjà un compte ?{" "}
            <Link
              to="/login"
              className="text-[#1b4b6b] font-semibold hover:underline transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterComponent;
