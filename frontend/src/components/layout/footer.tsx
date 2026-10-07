import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import { FOOTER_COLUMNS } from "../../constants/layout";
import type { LandingActions } from "../../utils/landingActions";

const destinations: Record<string, string> = {
  "Trouver une mission": "/espace/missions",
  "Créer un profil": "/register",
  "Publier une mission": "/espace/publier-mission",
  "Trouver un freelance": "/register",
};
const anchors: Record<string, string> = {
  "Comment ça marche": "#comment-ca-marche",
  "À propos": "#a-propos",
};

export default function Footer({ actions }: { actions: LandingActions }) {
  const columns = actions.signedIn
    ? FOOTER_COLUMNS.filter(
        (column) =>
          column.title !== "Freelances" && column.title !== "Annonceurs"
      )
    : FOOTER_COLUMNS;
  return (
    <footer className="landing-footer">
      <div className="landing-container footer-grid">
        <div className="footer-brand">
          <a className="footer-logo" href="#top" aria-label="Retour en haut">
            <BrandLogo className="landing-logo" />
          </a>
          <p>Le matching intelligent au service du freelancing en Afrique.</p>
          <div className="footer-socials" aria-label="Réseaux sociaux">
            <span role="img" aria-label="LinkedIn">
              in
            </span>
            <span role="img" aria-label="Instagram">
              ◎
            </span>
            <span role="img" aria-label="X">
              𝕏
            </span>
          </div>
        </div>
        <div
          className={`footer-links ${actions.signedIn ? "footer-links-member" : ""}`}
        >
          {actions.signedIn && (
            <div className="footer-column">
              <h3>{actions.footerTitle}</h3>
              <ul>
                {actions.footerLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {columns.map((column) => (
            <div className="footer-column" key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((label) => (
                  <li key={label}>
                    {destinations[label] ? (
                      <Link to={destinations[label]}>{label}</Link>
                    ) : anchors[label] ? (
                      <a href={anchors[label]}>{label}</a>
                    ) : (
                      <span>{label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="footer-copyright">
        © {new Date().getFullYear()} Jëfly. Tous droits réservés.
      </div>
    </footer>
  );
}
