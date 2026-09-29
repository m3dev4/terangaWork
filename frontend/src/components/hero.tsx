import { Link } from "react-router-dom";
import { HeroJefly } from "../assets/images";

export default function Hero() {
  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <h1 id="hero-title">Matcher</h1>
        <div className="hero-copy">
          <h2>Le bon profil, la bonne mission, sans perdre de temps.</h2>
          <p>Jëfly connecte freelances et clients grâce à un matching intelligent
            qui analyse compétences et besoins réels — fini les groupes WhatsApp
            et les dizaines de candidatures à trier à la main.</p>
          <Link className="hero-button" to="/register">Matcher • Connecter • Réussir</Link>
        </div>
        <img className="hero-illustration" src={HeroJefly}
          alt="Un freelance travaillant sur son ordinateur portable rouge"
          fetchPriority="high" />
      </div>
    </section>
  );
}
