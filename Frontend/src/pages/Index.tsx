import { Cloud, Shield, Zap, Users, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and advanced security protocols to keep your data safe.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized infrastructure ensures quick uploads and instant access to your files.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Share files, manage permissions, and collaborate seamlessly with your team.',
    },
  ];

  const benefits = [
    'Unlimited file storage',
    'Advanced file sharing',
    'Real-time collaboration',
    'Custom branding',
    '99.9% uptime SLA',
    '24/7 support',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Navigation */}
      <nav className="glass-card border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CloudDock
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="hover:bg-white/10"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-primary"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32 relative">
        {/* Animated background circles */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm">Trusted by 10,000+ organizations</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Your Cloud Storage,
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Your Brand
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Multi-tenant cloud storage SaaS with customizable branding, powerful file management,
            and enterprise-grade security.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-primary text-lg px-8 hover-lift"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="glass-card border-primary/20 hover:border-primary/40 text-lg px-8"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Everything you need for
            <span className="bg-gradient-primary bg-clip-text text-transparent"> modern cloud storage</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Powerful features designed for teams of all sizes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card rounded-3xl p-8 hover-lift animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-primary">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="glass-card rounded-3xl p-12 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-8 text-center">
            Why choose CloudDock?
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-foreground/80">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="glass-card rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of teams already using CloudDock
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-primary text-lg px-8 hover-lift"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-card border-t border-white/10 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 CloudDock. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
