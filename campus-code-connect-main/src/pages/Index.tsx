import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Hero, Features, HowItWorks, CTA } from "@/components/landing/LandingSections";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
