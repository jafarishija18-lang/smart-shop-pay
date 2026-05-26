import { createFileRoute, Link } from "@tanstack/react-router";
import { Fingerprint, ScanLine, Wallet, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/emoney-logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "E-Money — Royal Cashless School Wallet" },
      {
        name: "description",
        content:
          "E-Money — a regal cashless school wallet with fingerprint payments, contributions ledger, and weekly spending controls.",
      },
    ],
  }),
});

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm hover:shadow-[var(--shadow-glow)] transition-shadow">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center [background-image:var(--gradient-gold)] mb-4">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1 text-primary">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden text-foreground [background-image:var(--gradient-hero)]">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,oklch(0.86_0.16_90/_0.35),transparent_50%),radial-gradient(circle_at_80%_60%,oklch(0.65_0.13_80/_0.35),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="E-Money" width={48} height={48} className="h-12 w-12 object-contain" />
              <span className="font-semibold text-2xl text-primary tracking-tight">E-Money</span>
            </div>
            <Link to="/auth">
              <Button variant="hero" size="sm">Admin sign in</Button>
            </Link>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-xs mb-6 text-primary">
              <Crown className="h-3.5 w-3.5" />
              Royal. Cashless. Secure.
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
              <span className="text-primary">E-Money</span> — the regal <br className="hidden md:block" />
              cashless wallet for schools.
            </h1>
            <p className="text-lg md:text-xl text-foreground/75 max-w-2xl mb-10 leading-relaxed">
              Students pay with a fingerprint. Cashiers scan barcodes. Admins control balances,
              weekly limits, contributions, and receive alerts — all in one royal dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth"><Button variant="hero" size="xl">Get started</Button></Link>
              <a href="#features">
                <Button variant="outline" size="xl">See features</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Everything a school wallet needs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Fast checkouts, controlled spending, transparent contributions, zero cash handling.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature icon={ScanLine} title="Barcode checkout" desc="Scan items with any USB barcode reader. Items accumulate, totals update instantly." />
          <Feature icon={Fingerprint} title="Fingerprint authorization" desc="Each student authorizes purchases and contributions with their own fingerprint." />
          <Feature icon={Wallet} title="Wallet & weekly limits" desc="Top up balances and enforce a 10,000/week spending cap automatically." />
          <Feature icon={Crown} title="Class-aware roster" desc="Students grouped by Form 1–6, with combinations for Form 5 and 6." />
          <Feature icon={ShieldCheck} title="Secure by default" desc="Server-side checks, atomic transactions, and admin-only data access." />
          <Feature icon={Sparkles} title="Asasco · Offering · Trimming · Plaiting" desc="Dedicated tabs for non-shop contributions with a live ledger." />
        </div>
      </section>

      <footer className="border-t border-primary/20 py-8 text-center text-sm text-muted-foreground">
        <span className="text-primary font-semibold">E-Money</span> · Royal Cashless Wallet
      </footer>
    </div>
  );
}
