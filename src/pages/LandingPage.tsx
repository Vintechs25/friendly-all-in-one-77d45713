import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  BarChart3,
  Shield,
  Zap,
  Building2,
  Users,
  Package,
  Receipt,
  ChevronRight,
  Star,
  ArrowRight,
  Store,
  UtensilsCrossed,
  Hotel,
  Wrench,
  Pill,
  Warehouse,
} from "lucide-react";

const industries = [
  { icon: Store, label: "Retail Stores" },
  { icon: ShoppingCart, label: "Supermarkets" },
  { icon: Wrench, label: "Hardware Shops" },
  { icon: Hotel, label: "Hotels" },
  { icon: UtensilsCrossed, label: "Restaurants" },
  { icon: Pill, label: "Pharmacies" },
  { icon: Warehouse, label: "Wholesalers" },
];

const features = [
  {
    icon: ShoppingCart,
    title: "Smart POS Terminal",
    description: "Fast checkout with barcode scanning, multi-payment support including mobile money, and real-time tax calculation.",
  },
  {
    icon: Package,
    title: "Inventory Control",
    description: "Track stock levels, manage suppliers, automate purchase orders, and transfer stock between branches.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Real-time sales dashboards, profit calculations, and performance tracking across all branches.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Granular permissions for owners, managers, cashiers, waiters, and inventory officers.",
  },
  {
    icon: Building2,
    title: "Multi-Branch",
    description: "Manage unlimited branches from a single dashboard with centralized reporting and inventory.",
  },
  {
    icon: Shield,
    title: "Secure & Audited",
    description: "Full audit logging, data isolation per business, and enterprise-grade security controls.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "29",
    description: "Perfect for single-location businesses",
    features: ["1 Branch", "2 Users", "Basic POS", "Inventory Tracking", "Email Support"],
    popular: false,
  },
  {
    name: "Professional",
    price: "79",
    description: "For growing businesses with multiple locations",
    features: ["5 Branches", "15 Users", "Full POS + Kitchen Display", "Advanced Inventory", "Analytics Dashboard", "Priority Support"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "199",
    description: "For large-scale operations",
    features: ["Unlimited Branches", "Unlimited Users", "All Modules", "Custom Integrations", "API Access", "Dedicated Support"],
    popular: false,
  },
];

const stats = [
  { value: "10K+", label: "Businesses" },
  { value: "50M+", label: "Transactions" },
  { value: "99.9%", label: "Uptime" },
  { value: "30+", label: "Countries" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SwiftPOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#industries" className="hover:text-foreground transition-colors">Industries</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="container text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Star className="h-3.5 w-3.5" />
              Trusted by 10,000+ businesses worldwide
            </div>
            <h1 className="animate-fade-up font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              The Complete
              <span className="text-gradient"> POS Platform </span>
              for Every Business
            </h1>
            <p className="animate-fade-up stagger-1 mt-6 text-lg text-primary-foreground/70 md:text-xl max-w-2xl mx-auto opacity-0">
              Manage sales, inventory, staff, and analytics — all from one powerful cloud platform. Built for retail, hospitality, and wholesale.
            </p>
            <div className="animate-fade-up stagger-2 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0">
              <Link to="/signup">
                <Button variant="hero" size="lg" className="text-base px-8">
                  Start Free Trial <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="hero-outline" size="lg" className="text-base px-8 text-primary-foreground/80 border-primary-foreground/20 hover:bg-primary-foreground/10">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="animate-fade-up stagger-3 mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto opacity-0">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-display font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-sm text-primary-foreground/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-16 border-b border-border">
        <div className="container">
          <p className="text-center text-sm font-medium text-muted-foreground mb-8">BUILT FOR EVERY INDUSTRY</p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {industries.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-32">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Everything you need to run your business</h2>
            <p className="mt-4 text-muted-foreground text-lg">One platform, all the tools. From point of sale to inventory, analytics to team management.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Simple, transparent pricing</h2>
            <p className="mt-4 text-muted-foreground text-lg">Start free, scale as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border bg-card p-8 relative ${
                  plan.popular ? "border-primary shadow-lg shadow-primary/10 scale-105" : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-6 mb-6">
                  <span className="font-display text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <Link to="/signup">
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    Get Started <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-gradient py-20">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">Ready to transform your business?</h2>
          <p className="mt-4 text-primary-foreground/70 text-lg max-w-xl mx-auto">Join thousands of businesses already using SwiftPOS to streamline operations and boost revenue.</p>
          <div className="mt-8">
            <Link to="/signup">
              <Button variant="hero" size="lg" className="text-base px-8">
                Start Your Free Trial <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">SwiftPOS</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 SwiftPOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
