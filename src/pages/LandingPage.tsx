import { useNavigate } from 'react-router-dom';
import NavBar from '@/components/landing/NavBar';
import HeroSection from '@/components/landing/HeroSection';
import ImpactSection from '@/components/landing/ImpactSection';
import ProblemSection from '@/components/landing/ProblemSection';
import BeliefBreakSection from '@/components/landing/BeliefBreakSection';
import LeadCaptureSection from '@/components/landing/LeadCaptureSection';
import SolutionSection from '@/components/landing/SolutionSection';
import ModulesSection from '@/components/landing/ModulesSection';
import DemoSection from '@/components/landing/DemoSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import PlansSection from '@/components/landing/PlansSection';
import WhatsAppServiceSection from '@/components/landing/WhatsAppServiceSection';
import ObjectionSection from '@/components/landing/ObjectionSection';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';
import WhatsAppFAB from '@/components/landing/WhatsAppFAB';

export default function LandingPage() {
  const navigate = useNavigate();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar onScrollTo={scrollTo} onLogin={() => navigate('/login')} />
      <HeroSection onScrollTo={scrollTo} />
      <ImpactSection />
      <ProblemSection />
      <BeliefBreakSection />
      <LeadCaptureSection />
      <SolutionSection />
      <ModulesSection />
      <DemoSection />
      <BenefitsSection />
      <PlansSection />
      <WhatsAppServiceSection />
      <ObjectionSection />
      <FinalCTA onScrollTo={scrollTo} />
      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
