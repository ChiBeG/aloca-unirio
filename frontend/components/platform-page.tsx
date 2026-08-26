import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
};

type ModuleCardProps = {
  description: string;
  href: Route;
  icon: LucideIcon;
  status: string;
  title: string;
};

export function PageHeader({
  badge,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className="route-hero">
      <div>
        <p className="page-eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {badge ? <span className="page-badge">{badge}</span> : null}
    </header>
  );
}

export function ModuleCard({
  description,
  href,
  icon: Icon,
  status,
  title,
}: ModuleCardProps) {
  return (
    <Link className="module-card" href={href}>
      <span className="module-icon">
        <Icon aria-hidden="true" size={20} />
      </span>
      <span className="module-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="module-status">{status}</span>
    </Link>
  );
}

export function InfoPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="info-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function DependencyList({ items }: { items: string[] }) {
  return (
    <ul className="dependency-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
