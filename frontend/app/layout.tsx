import type { Metadata } from "next";
import type { ReactNode } from "react";

import logoVertical from "@/assets/identity/unirio-logo-vertical.png";
import { AppNavbar } from "@/components/app-navbar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Aloca UNIRIO",
  description: "Frontend MVP para alocacao de salas da UNIRIO.",
  icons: {
    icon: logoVertical.src,
    apple: logoVertical.src,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <AppNavbar />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
