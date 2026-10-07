import type { AuthUser } from "../interfaces/authInterface";

type LandingUser = Pick<AuthUser, "role" | "onboarding_completed"> & {
  is_staff?: boolean;
  is_superuser?: boolean;
};

export function getLandingActions(
  user: LandingUser | null | undefined,
  hasSession: boolean
) {
  if (!hasSession) {
    return {
      signedIn: false,
      primary: { label: "Créer un compte", to: "/register" },
      account: { label: "Se connecter", to: "/login" },
      footerTitle: "",
      footerLinks: [] as { label: string; to: string }[],
    };
  }

  const admin = user?.role === "admin" || user?.is_staff || user?.is_superuser;
  const completingProfile = Boolean(
    user && !admin && !user.onboarding_completed
  );
  const account = {
    label: completingProfile ? "Compléter mon profil" : "Mon espace",
    to: admin ? "/espace/admin" : completingProfile ? "/onboarding" : "/espace",
  };
  const primary =
    !user || admin || completingProfile
      ? account
      : user.role === "freelance"
        ? { label: "Trouver une mission", to: "/espace/missions" }
        : user.role === "annonceur"
          ? { label: "Publier une mission", to: "/espace/publier-mission" }
          : account;

  const footerLinks =
    !user || admin || completingProfile
      ? [account]
      : user.role === "freelance"
        ? [
            primary,
            { label: "Mes missions", to: "/espace/mes-missions" },
            { label: "Mon profil", to: "/espace/profil" },
          ]
        : user.role === "annonceur"
          ? [
              primary,
              { label: "Mes annonces", to: "/espace/mes-annonces" },
              {
                label: "Candidatures reçues",
                to: "/espace/candidatures-recues",
              },
            ]
          : [account];

  return {
    signedIn: true,
    primary,
    account,
    footerTitle: admin ? "Administration" : "Mon espace",
    footerLinks,
  };
}

export type LandingActions = ReturnType<typeof getLandingActions>;
