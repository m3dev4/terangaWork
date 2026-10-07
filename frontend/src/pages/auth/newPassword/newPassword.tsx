import React from "react";
import AuthTitleDesc from "../../../components/auth/authTitleDesc";
import NewPasswordComponent from "../../../components/auth/NewPassword";

const NewPassword = () => {
  return (
    <div className="flex flex-col space-y-2 justify-start items-start w-full">
      <AuthTitleDesc
        title="Nouveau mot de"
        span="passe"
        description="Choisissez un mot de passe robuste pour protéger l'accès à votre compte."
      />
      <NewPasswordComponent />
    </div>
  );
};

export default NewPassword;
