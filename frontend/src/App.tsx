import Cta from './components/cta';
import Hero from './components/hero';
import HowItWorks from './components/howItWork';
import Footer from './components/layout/footer';
import Header from './components/layout/Header';
import './App.css';

export default function App() {
  return (
    <div id="top" className="landing-page">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
