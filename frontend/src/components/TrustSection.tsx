import { ArrowRight } from "lucide-react";

export default function TrustSection() {
  return (
    <section id="a-propos" className="landing-trust" aria-labelledby="trust-title">
      <div className="landing-container">
        <div className="trust-intro">
          <span className="landing-eyebrow">+200 missions déjà réalisées</span>
          <h2 id="trust-title">Des collaborations qui vont jusqu’au bout.</h2>
        </div>
        <div className="trust-grid">
          <article className="trust-card trust-vision">
            <span className="trust-label">Notre vision</span>
            <h3>Sortir les collaborations de l’informel.</h3>
            <p>Aujourd’hui, beaucoup de collaborations commencent sur les réseaux sociaux, entre messages dispersés et manque de suivi. Jëfly crée un cadre structuré pour mettre en relation, suivre les échanges et accompagner chaque collaboration jusqu’à sa réalisation.</p>
          </article>
          <article className="trust-card trust-history">
            <span className="trust-label">Une trace à chaque étape</span>
            <h3>Un historique pour chaque paiement</h3>
            <p>Chaque paiement effectué via Jëfly est enregistré et reste accessible depuis votre espace. Vous pouvez ainsi retrouver les montants, les dates et le statut de vos transactions, pour garder une trace claire de chaque collaboration.</p>
          </article>
          <article className="trust-card trust-verified">
            <span className="trust-label">La confiance, avant tout</span>
            <h3>Des profils vérifiés</h3>
            <p>Chaque freelance doit passer par un processus de vérification avant de pouvoir collaborer sur Jëfly. L’identité et les éléments nécessaires à son profil sont contrôlés afin d’offrir un environnement plus fiable aux utilisateurs.</p>
          </article>
          <article className="trust-card trust-payment">
            <span className="trust-label">Un paiement encadré et transparent</span>
            <h3>Sortir les collaborations de l’informel.</h3>
            <div className="payment-flow" aria-label="Paiement de l’annonceur via PayDunya au freelance">
              <span>Annonceur</span><ArrowRight aria-hidden="true" /><span>PayDunya</span><ArrowRight aria-hidden="true" /><span>Freelance</span>
            </div>
            <p>Aujourd’hui, beaucoup de collaborations commencent sur les réseaux sociaux, entre messages dispersés et manque de suivi. Jëfly crée un cadre structuré pour mettre en relation, suivre les échanges et accompagner chaque collaboration jusqu’à sa réalisation.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
