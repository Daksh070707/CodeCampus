import { motion } from "framer-motion";
import { Code2, Users, Briefcase, MessageSquare, Sparkles, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="skill" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Campus Hiring Platform
            </Badge>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Where <span className="gradient-text">Talent</span> Meets
            <br />
            <span className="gradient-text">Opportunity</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            CodeCampus connects students, recruiters, and colleges in one collaborative platform. 
            Share code, find opportunities, and launch your tech career.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">
                Get Started Free
                <Zap className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/login">
                Sign In
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {[
              { value: "500+", label: "Colleges" },
              { value: "50K+", label: "Students" },
              { value: "2K+", label: "Recruiters" },
              { value: "10K+", label: "Jobs Posted" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-1/4 right-10 hidden lg:block"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="glass rounded-xl p-4 shadow-lg">
          <Code2 className="w-8 h-8 text-primary" />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-1/4 left-10 hidden lg:block"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="glass rounded-xl p-4 shadow-lg">
          <Briefcase className="w-8 h-8 text-recruiter" />
        </div>
      </motion.div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      icon: Users,
      title: "College Communities",
      description: "Each college has its own private community with isolated feeds, discussions, and opportunities.",
      color: "text-primary",
    },
    {
      icon: Code2,
      title: "Code Sharing",
      description: "Share projects, code snippets, and technical posts with syntax highlighting and markdown support.",
      color: "text-student",
    },
    {
      icon: Briefcase,
      title: "Job Board",
      description: "Recruiters post internships and full-time roles. Students apply with one click.",
      color: "text-recruiter",
    },
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Private messaging and college channels for seamless communication.",
      color: "text-accent",
    },
    {
      icon: Sparkles,
      title: "AI Matching",
      description: "Smart recommendations match students to jobs based on skills and activity.",
      color: "text-primary",
    },
    {
      icon: Shield,
      title: "Admin Control",
      description: "College admins moderate content and manage their community with powerful tools.",
      color: "text-admin",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to <span className="gradient-text">Succeed</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete platform for coding collaboration, career development, and campus hiring.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="glass rounded-xl p-6 card-hover"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <feature.icon className={`w-10 h-10 ${feature.color} mb-4`} />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      step: "01",
      title: "Sign Up & Join",
      description: "Create your account, select your role, and join your college community.",
    },
    {
      step: "02",
      title: "Build Your Profile",
      description: "Add your skills, projects, and experiences. Let AI understand your potential.",
    },
    {
      step: "03",
      title: "Connect & Grow",
      description: "Engage with peers, share knowledge, and discover opportunities matched to you.",
    },
  ];

  return (
    <section className="py-24 relative bg-secondary/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get Started in <span className="gradient-text">3 Steps</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <motion.div
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              viewport={{ once: true }}
            >
              <div className="text-6xl font-bold gradient-text mb-4">{item.step}</div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center glass rounded-2xl p-12 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
          <div className="relative z-10">
            <Globe className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Join the Community?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Start your journey today. Connect with peers, find opportunities, and accelerate your career.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" asChild>
                <Link to="/register">Create Free Account</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link to="/login">Already have an account?</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export { Hero, Features, HowItWorks, CTA };
