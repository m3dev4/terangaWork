import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type AuthFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
};

export default function AuthField({
  label,
  error,
  hint,
  type = "text",
  id,
  ...props
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  const Icon = password ? Lock : Mail;
  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <Label htmlFor={id}>{label}</Label>
        {hint}
      </div>
      <div className="auth-input-wrap">
        <Icon className="auth-input-icon" aria-hidden="true" />
        <Input
          {...props}
          id={id}
          type={password && visible ? "text" : type}
          className="auth-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {password && (
          <button
            className="auth-password-toggle"
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={
              visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p className="auth-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
