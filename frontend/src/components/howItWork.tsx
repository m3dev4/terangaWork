export default function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="landing-how" aria-labelledby="how-title">
      <div className="landing-container">
        <div className="how-intro">
          <p className="how-eyebrow"><span aria-hidden="true" />+200 missions déjà réalisées</p>
          <h2 id="how-title">Comment ça marche</h2>
          <p className="how-description">
            Passez de l&apos;informel des groupes WhatsApp à une plateforme
            structurée où vos compétences réelles vous connectent aux
            meilleures opportunités.
          </p>
        </div>
        <div className="how-grid">
          <article className="how-card how-profile">
            <span className="how-step">01</span>
            <h3>Créez votre profil</h3>
            <p>Mettez en avant vos compétences techniques, vos expériences
              passées et vos tarifs pour maximiser votre visibilité.</p>
            <div className="profile-preview" aria-label="Exemple de profil freelance">
              <div className="profile-identity">
                <span className="profile-avatar" aria-hidden="true">AT</span>
                <div><strong>Alioune Tine</strong><span>UI Designer</span></div>
              </div>
              <div className="profile-skills">
                {["Figma", "React", "Framer"].map((skill) => <span key={skill}>{skill}</span>)}
              </div>
              <div className="profile-optimization"><span aria-hidden="true" />Optimisation IA disponible</div>
              <div className="profile-rating"><strong><span aria-hidden="true">★</span> 5.0</strong><span>24 projets réalisés</span></div>
            </div>
          </article>
          <article className="how-card how-match">
            <div className="match-copy">
              <span className="how-step">02</span>
              <h3>Matchez avec des missions</h3>
              <p>Notre algorithme analyse vos points forts pour vous proposer
                des missions qui vous correspondent réellement.</p>
            </div>
            <div className="match-preview">
              <strong>98%</strong>
              <span>Match trouvé</span>
              <span className="match-recommendation">Recommandé par IA</span>
            </div>
          </article>
          <article className="how-card how-collaborate">
            <span className="how-step">03</span>
            <h3>Collaborez et réussissez</h3>
            <p>Gérez vos projets en toute sécurité avec un suivi intégré
              et un paiement garanti.</p>
            <span className="secure-payment">Paiement sécurisé</span>
          </article>
          <div className="how-card how-stat">
            <strong>200+</strong>
            <p>missions déjà réalisées sur Teranga Work</p>
          </div>
        </div>
      </div>
    </section>
  );
}
