import { Outlet, Link, useLocation } from "react-router-dom";
import JeflyWordmark from "../../components/JeflyWordmark";
import "./auth.css";

export default function AuthLayout() {
  const { pathname } = useLocation();
  const centered = pathname === "/verify-email";
  return (
    <main className={`auth-layout ${centered ? "auth-layout-centered" : ""}`}>
      {!centered && <aside className="auth-visual" aria-label="Jëfly">
        <Link className="auth-home" to="/" aria-label="Jëfly, revenir à l’accueil"><JeflyWordmark /></Link>
      </aside>}
      <section className="auth-card" aria-label="Votre compte Jëfly">
        <Link className="auth-mobile-home" to="/" aria-label="Jëfly, revenir à l’accueil"><JeflyWordmark /></Link>
        <div className="auth-content"><Outlet /></div>
      </section>
    </main>
  );
}
