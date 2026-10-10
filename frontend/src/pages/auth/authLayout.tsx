import { Outlet, Link, useLocation } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import "./auth.css";
import ImageStreamHero from "@/components/authHeroImage";
import {
  con,
  free,
  freelnaceIllust,
  relation,
  terangaWorkCon,
} from "@/assets/images";

const IMAGEAUTH = [
  {
    src: freelnaceIllust,
    alt: "Illustration d’un freelance travaillant sur son ordinateur portable, assis sur un canapé avec une tasse de café à côté.",
  },
  {
    src: terangaWorkCon,
    alt: "Illustration d’un freelance travaillant sur son ordinateur portable, assis sur un canapé avec une tasse de café à côté.",
  },
  {
    src: con,
    alt: "Illustration d’un freelance travaillant sur son ordinateur portable, assis sur un canapé avec une tasse de café à côté.",
  },
  {
    src: free,
    alt: "Illustration d’un freelance travaillant sur son ordinateur portable, assis sur un canapé avec une tasse de café à côté.",
  },
  {
    src: relation,
    alt: "Illustration d’un freelance travaillant sur son ordinateur portable, assis sur un canapé avec une tasse de café à côté.",
  },
];

export default function AuthLayout() {
  const { pathname } = useLocation();
  const centered = pathname === "/verify-email";
  return (
    <main className={`auth-layout ${centered ? "auth-layout-centered" : ""}`}>
      {!centered && (
        <ImageStreamHero
          images={IMAGEAUTH}
          className="h-140 w-full rounded-lg border border-border "
        >
          <div className="relative z-10 flex h-full flex-col items-center justify-between py-12 text-center">
            <div className="px-6">
              <h1 className="text-balance font-sora text-4xl font-bold tracking-tight  sm:text-5xl">
                Trouvez votre prochain collaborateur sur TerangaWork
              </h1>
            </div>
          </div>
        </ImageStreamHero>
      )}
      <section className="auth-card" aria-label="Votre compte TerangaWork">
        <Link
          className="auth-mobile-home"
          to="/"
          aria-label="TerangaWork, revenir à l’accueil"
        >
          <BrandLogo className="w-32" />
        </Link>
        <div className="auth-content">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
