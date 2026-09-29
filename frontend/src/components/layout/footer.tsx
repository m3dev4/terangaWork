// import { Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { TWLogo } from "../../assets/images";
import { FOOTER_COLUMNS } from "../../constants/layout";

const footerDestinations: Record<string, string> = {
  "Trouver une mission": "/espace/missions",
  "Créer un profil": "/register",
  "Publier une mission": "/espace/publier-mission",
  "Trouver un freelance": "/register",
};
const footerAnchors: Record<string, string> = {
  "Comment ça marche": "#comment-ca-marche",
  "À propos": "#a-propos",
};

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#top" aria-label="Jëfly, retour en haut"><img src={TWLogo} alt="Jëfly" width="64" height="64" /></a>
            <p>Le matching intelligent au service du freelancing en Afrique.</p>
            <div className="footer-socials" aria-label="Réseaux sociaux">
              {/* <span role="img" aria-label="LinkedIn"><Linkedin size={16} aria-hidden="true" /></span> */}
              <span role="img" aria-label="X">𝕏</span>
      
            </div>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div className="footer-column" key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((label) => (
                  <li key={label}>
                    {footerDestinations[label] ? <Link to={footerDestinations[label]}>{label}</Link>
                      : footerAnchors[label] ? <a href={footerAnchors[label]}>{label}</a>
                      : <span>{label}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-copyright">© 2026 Jëfly. Tous droits réservés.</div>
      </div>
    </footer>
  );
}
