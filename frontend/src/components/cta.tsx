import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import type { LandingActions } from "../utils/landingActions";

export default function Cta({ actions }: { actions: LandingActions }) {
  return (
    <section className="landing-cta" aria-labelledby="cta-title">
      <div className="landing-container cta-panel">
        <div className="cta-copy">
          <h2 id="cta-title">Loy Xar ?</h2>
          <p>
            Que vous soyez un talent en quête de liberté ou une entreprise à la
            recherche d’excellence, Jëfly est votre nouveau point de rencontre.
          </p>
          <div className="cta-actions">
            <Button
              className="landing-button"
              render={<Link to={actions.primary.to} />}
            >
              {actions.primary.label}
            </Button>
            <Button
              variant="outline"
              className="landing-button"
              render={<a href="#comment-ca-marche" />}
            >
              Comment ça marche
            </Button>
          </div>
        </div>
        <div className="cta-visual" aria-hidden="true" />
      </div>
    </section>
  );
}
