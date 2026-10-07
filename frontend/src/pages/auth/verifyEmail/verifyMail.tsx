import AuthTitleDesc from "../../../components/auth/authTitleDesc";
import VerifyMailComponent from "../../../components/auth/verifyMail";

const VerifyMail = () => {
  return (
    <div className="flex flex-col space-y-2 justify-start items-start w-full">
      <AuthTitleDesc
        title="Vérifiez votre"
        span="email"
        description="Entrez le code de vérification reçu par email."
      />
      <VerifyMailComponent />
    </div>
  );
};

export default VerifyMail;
