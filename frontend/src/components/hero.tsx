import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import heroFreelance from "../assets/figma/hero-freelance.png";
import type { LandingActions } from "../utils/landingActions";

export default function Hero({ actions }: { actions: LandingActions }) {
  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="landing-container hero-inner">
        <div className="hero-copy">
          <span className="landing-eyebrow">Matcher • Connecter • Réussir</span>
          <h1 id="hero-title">
            Le bon profil, la bonne mission,
            <br />
            sans perdre de temps.
          </h1>
          <p>
            Jëfly connecte freelances et clients grâce à un matching intelligent
            qui analyse compétences et besoins réels — fini les groupes WhatsApp
            et les dizaines de candidatures à trier à la main.
          </p>
          <Button
            className="hero-button landing-button"
            render={<Link to={actions.primary.to} />}
          >
            {actions.primary.label}
          </Button>
        </div>
        <div className="hero-visual">
          <img
            src={heroFreelance}
            alt="Un freelance travaillant sur son ordinateur portable rouge"
            width="760"
            height="520"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
}
