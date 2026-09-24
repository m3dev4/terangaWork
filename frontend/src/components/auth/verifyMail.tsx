import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import OptCode from "../optCode";
import { Button } from "../ui/button";
import { ArrowLeftIcon, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { VerifyEmail } from "../../interfaces/authInterface";
import { useVerifyEmail } from "../../hooks/useAuth";

const VerifyMailComponent = () => {
  const inputRef = useRef<(HTMLInputElement | null)[]>([]);
  const verifyMutation = useVerifyEmail();
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const { register, setValue, handleSubmit, watch } = useForm<VerifyEmail>({
    defaultValues: {
      email: stateEmail ?? sessionStorage.getItem("verification_email") ?? "",
      code: "",
    },
  });
  const email = watch("email");

  const handleCodeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setValue("code", nextOtp.join(""), { shouldValidate: true });

    if (digit && index < 5) {
      inputRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRef.current[index - 1]?.focus();
    }
  };

  return (
    <form
      noValidate
      className="w-full flex flex-col items-center gap-6 mt-6"
      onSubmit={handleSubmit((data) => verifyMutation.mutate(data))}
    >
      <div className="w-full">
        <input
          type="email"
          placeholder="exemple@test.com"
          className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#1b4b6b] focus:bg-white text-xs sm:text-sm px-3.5 py-2.5 rounded-lg transition-colors placeholder:text-neutral-400"
          {...register("email", { required: "L'email est obligatoire." })}
        />
      </div>
      <input type="hidden" {...register("code")} />
      <div className="flex justify-between gap-2 sm:gap-3 w-full max-w-sm">
        {Array.from({ length: 6 }, (_, i) => i).map((i) => (
          <OptCode
            key={i}
            index={i}
            inputRefs={inputRef}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
      <div className="flex flex-col items-center justify-center gap-2 text-xs">
        <p className="text-neutral-400">Vous n'avez pas reçu de code ?</p>
        <button
          type="button"
          className="text-[#1b4b6b] font-semibold hover:underline cursor-pointer"
        >
          Renvoyer le code
        </button>
      </div>
      <Button
        type="submit"
        className="w-full h-11 bg-secondary-terangawork hover:bg-[#e0893a] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm"
        disabled={
          verifyMutation.isPending || !email || otp.join("").length !== 6
        }
      >
        {verifyMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          "Vérifier"
        )}
      </Button>
      <div className="flex items-center justify-center mt-4">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer p-2 rounded-lg hover:bg-neutral-100"
          onClick={() => navigate("/login")}
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Retour à la connexion</span>
        </button>
      </div>
    </form>
  );
};

export default VerifyMailComponent;
