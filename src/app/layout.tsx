import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supermercado GTA7 Central",
  description: "Entidade Supermercado da GTA7 Lab",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
