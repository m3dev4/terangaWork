import Cta from './components/cta';
import Hero from './components/hero';
import HowItWorks from './components/howItWork';
import TrustSection from './components/TrustSection';
import Footer from './components/layout/footer';
import Header from './components/layout/Header';
import { useQuery } from '@tanstack/react-query';
import getCurrentUser from './utils/getUser';
import { getLandingActions } from './utils/landingActions';
import './App.css';

export default function App() {
  const hasSession = Boolean(localStorage.getItem('access_token'));
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: hasSession,
    retry: false,
  });
  // Keep account actions while a saved session is being restored or the API is unavailable.
  // Protected routes still validate the session before granting access.
  const actions = getLandingActions(user, hasSession);
  return (
    <div id="top" className="landing-page">
      <Header actions={actions} />
      <main>
        <Hero actions={actions} />
        <HowItWorks />
        <TrustSection />
        <Cta actions={actions} />
      </main>
      <Footer actions={actions} />
    </div>
  );
}
