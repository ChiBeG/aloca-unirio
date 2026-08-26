"use client";

import { Menu, ShieldCheck, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import logoHorizontal from "@/assets/identity/unirio-logo-horizontal.png";

const navItems = [
  { label: "Inicio", href: "/" },
  { label: "Alocacao", href: "/alocacao" },
  { label: "Importacao", href: "/importacao" },
  { label: "Grade", href: "/grade" },
  { label: "Conflitos", href: "/conflitos" },
  { label: "Historico", href: "/historico" },
] satisfies ReadonlyArray<{ label: string; href: Route }>;

export function AppNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isTransparent = pathname === "/" && !isScrolled;

  return (
    <nav
      aria-label="Navegacao principal"
      className="app-navbar"
      data-transparent={isTransparent}
    >
      <div className="navbar-inner">
        <Link aria-label="Pagina inicial" className="navbar-brand" href="/">
          <img
            alt="UNIRIO"
            className="navbar-logo"
            src={logoHorizontal.src}
          />
          <span className="navbar-title">
            <span>ALOCACAO DE SALAS</span>
            <small>PORTAL ACADEMICO</small>
          </span>
        </Link>

        <div className="navbar-links" aria-label="Secoes da plataforma">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className="navbar-link"
                data-active={isActive}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="navbar-actions">
          <span className="auth-pill" title="Login depende do backend">
            <ShieldCheck aria-hidden="true" size={15} />
            <span>Acesso pendente</span>
          </span>

          <button
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            type="button"
          >
            {isMobileMenuOpen ? (
              <X aria-hidden="true" size={22} />
            ) : (
              <Menu aria-hidden="true" size={22} />
            )}
          </button>
        </div>
      </div>

      <div className="mobile-nav-panel" data-open={isMobileMenuOpen}>
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className="mobile-nav-link"
              data-active={isActive}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
