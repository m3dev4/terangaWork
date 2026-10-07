import React from "react";
import AuthTitleDesc from "../../../components/auth/authTitleDesc";
import PasswordRecoveryComponent from "../../../components/auth/passwordRecovery";

const PasswordRecovery = () => {
  return (
    <div className="flex flex-col space-y-2 justify-start items-start w-full">
      <AuthTitleDesc
        title="Mot de passe"
        span="oublié ?"
        description="Entrez votre email pour recevoir un lien de réinitialisation."
      />
      <PasswordRecoveryComponent />
    </div>
  );
};

export default PasswordRecovery;
