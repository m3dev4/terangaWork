interface AuthTitleDescProps {
  title: string;
  description: string;
  span: string;
}

const AuthTitleDesc = ({ title, description, span }: AuthTitleDescProps) => {
  return (
    <div className="flex flex-col space-y-1.5 items-start w-full">
      <h2 className="text-2xl sm:text-3xl font-bold font-heading text-neutral-900 tracking-tight">
        {title} <span className="text-secondary-terangawork">{span}</span>
      </h2>
      <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default AuthTitleDesc;
