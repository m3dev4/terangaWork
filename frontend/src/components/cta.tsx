import { Link } from "react-router-dom";

export default function Cta() {
  return (
    <section id="a-propos" className="landing-cta" aria-labelledby="cta-title">
      <div className="landing-container">
        <div className="cta-panel">
          <h2 id="cta-title">Loy Xar ?</h2>
          <p>Que vous soyez un talent en quête de liberté ou une entreprise à la
            recherche d&apos;excellence, Jëfly est votre nouveau point de rencontre.</p>
          <div className="cta-actions">
            <Link className="landing-button landing-button-primary" to="/register">Créer un compte</Link>
            <a className="landing-button landing-button-secondary" href="#comment-ca-marche">Comment ça marche</a>
          </div>
        </div>
      </div>
    </section>
  );
}
