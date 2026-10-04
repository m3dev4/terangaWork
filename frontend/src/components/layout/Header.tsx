import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import BrandLogo from "../BrandLogo";
import type { LandingActions } from "../../utils/landingActions";

export default function Header({ actions }: { actions: LandingActions }) {
  return (
    <header className="landing-header">
      <div className="landing-container header-inner">
        <a className="header-brand" href="#top" aria-label="Accueil"><BrandLogo className="landing-logo" /></a>
        <nav aria-label="Navigation principale">
          <a href="#comment-ca-marche">Comment ça marche</a>
          <a href="#a-propos">À propos</a>
        </nav>
        <div className="header-actions">
          {actions.signedIn ? <Button className="landing-button" render={<Link to={actions.account.to} />}>{actions.account.label}</Button> : <>
            <Button variant="outline" className="landing-button" render={<Link to="/login" />}>Se connecter</Button>
            <Button className="landing-button" render={<Link to="/register" />}>S’inscrire</Button>
          </>}
        </div>
      </div>
    </header>
  );
}
