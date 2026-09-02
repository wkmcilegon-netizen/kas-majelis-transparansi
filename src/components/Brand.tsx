import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo-mtjsi.asset.json";
import { Button } from "@/components/ui/button";

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <img
      src={logo.url}
      alt="Logo Majelis Ta'lim & Dzikir Jam'iyyah Simthuddurar Al-Istiqomah"
      width={size}
      height={size}
      className="rounded-full object-contain"
      style={{ width: size, height: size }}
    />
  );
}

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-gradient-navy text-primary-foreground">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
        <Logo size={52} />
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
            Majelis Ta'lim &amp; Dzikir
          </p>
          <h1 className="truncate text-lg leading-tight font-bold text-gradient-gold">
            Jam'iyyah Simthuddurar Al-Istiqomah
          </h1>
          {subtitle ? <p className="text-xs text-primary-foreground/70">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}

export function BackButton({ to, label = "Kembali" }: { to: string; label?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <Link to={to}>
        <ArrowLeft className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
