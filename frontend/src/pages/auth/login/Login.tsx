import AuthTitleDesc from '../../../components/auth/authTitleDesc';
import LoginComponent from '../../../components/auth/login';

const Login = () => {
  return (
    <div className="flex flex-col space-y-2 justify-start items-start w-full">
      <AuthTitleDesc
        title="Connectez-"
        span="vous"
        description="Heureux de vous revoir sur TerangaWork"
      />
      <LoginComponent />
    </div>
  );
};

export default Login;
