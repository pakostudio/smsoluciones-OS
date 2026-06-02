import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SM OS",
  description: "Sistema Operativo de Gestión Interna de SM Soluciones",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
