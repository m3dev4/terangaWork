import { useNavigate } from "react-router-dom";
import { TWLogo } from "../../assets/images";
import { NAV_LINKS } from "../../constants/utils";
import { useQuery } from "@tanstack/react-query";
import getCurrentUser from "../../utils/getUser";

export default function Header() {
  const navigate = useNavigate();
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: false,
  });
  return (
    <header className="sticky top-0 z-50 bg-[#F7F7F5]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <img
            src={TWLogo}
            alt="Jëfly"
            className="h-10 w-auto object-contain"
          />
        </a>

        <nav className="hidden items-center gap-2 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-lg px-3 py-2 font-sans text-sm font-medium text-[#1E1E24] transition hover:bg-black/5 hover:text-[#F2994A]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {user ? (
          <>
            <button
              type="button"
              onClick={() => {
                const isAdmin = user.role === 'admin' || (user as any).is_staff || (user as any).is_superuser;
                if (isAdmin) {
                  navigate('/espace/admin');
                } else {
                  navigate(user.onboarding_completed ? '/espace' : '/onboarding');
                }
              }}
              className="py-2.5 px-5 rounded-lg cursor-pointer bg-[#f2994a] hover:bg-[#e0893a] text-white font-heading font-semibold text-sm shadow-xs transition-colors"
            >
              Mon espace
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-neutral-200 px-4 py-2 font-sans text-sm font-medium text-[#1E1E24] transition-colors hover:bg-neutral-100 cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Se connecter
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#f2994a] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#e0893a] shadow-xs cursor-pointer"
              onClick={() => navigate("/register")}
            >
              S'inscrire
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
