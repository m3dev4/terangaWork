import profileImage from "../assets/figma/step-profile.png";
import matchingImage from "../assets/figma/step-matching.png";
import collaborationImage from "../assets/figma/step-collaboration.png";

const steps = [
  { number: "01", title: "Créez votre profil", description: "Mettez en avant vos compétences techniques, vos expériences passées et vos tarifs pour maximiser votre visibilité.", image: profileImage },
  { number: "02", title: "Matchez avec des missions", description: "Notre algorithme analyse vos points forts pour vous proposer des missions qui vous correspondent réellement.", image: matchingImage },
  { number: "03", title: "Collaborez et réussissez", description: "Gérez vos projets en toute sécurité avec un suivi intégré et un paiement garanti.", image: collaborationImage },
];

export default function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="landing-how" aria-labelledby="how-title">
      <div className="landing-container how-layout">
        <div className="how-intro">
          <span className="landing-eyebrow">+200 missions déjà réalisées</span>
          <h2 id="how-title">Comment ça marche</h2>
          <p>Passez de l’informel des groupes WhatsApp à une plateforme structurée où vos compétences réelles vous connectent aux meilleures opportunités.</p>
        </div>
        <ol className="how-steps">
          {steps.map((step) => (
            <li className="how-card" key={step.number}>
              <span className="how-number">{step.number}</span>
              <div className="how-copy"><h3>{step.title}</h3><p>{step.description}</p></div>
              <img src={step.image} alt="" width="220" height="220" loading="lazy" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
