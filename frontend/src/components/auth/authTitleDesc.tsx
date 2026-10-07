import type { ReactNode } from "react";

interface AuthTitleDescProps {
  title: string;
  description: ReactNode;
  span: string;
}

export default function AuthTitleDesc({
  title,
  description,
  span,
}: AuthTitleDescProps) {
  return (
    <div className="auth-heading">
      <h1>
        {title} <span>{span}</span>
      </h1>
      <p>{description}</p>
    </div>
  );
}
