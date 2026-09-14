import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSessionGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppSidebar from "@/components/app-sidebar";
import RegisterSW from "@/components/register-sw";
import InstallBanner from "@/components/install-banner";
import AutoMeldingen from "@/components/auto-meldingen";

export const metadata: Metadata = {
  title: "Cheese Stock Manager",
  description: "Van Beek & De Vreugd Kaas — voorraadbeheer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cheese Stock Manager",
  },
};

export const viewport: Viewport = {
  themeColor: "#223B2C",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gebruiker = await getSessionGebruiker();
  const openAfroepen =
    gebruiker && gebruiker.rol?.canReserveren ? await prisma.afroep.count({ where: { status: "open" } }) : 0;

  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-ink font-sans">
        <RegisterSW />
        {gebruiker && gebruiker.rol?.ontvangtAfroepMeldingen && <AutoMeldingen />}
        {/*
          Twee écht verschillende indelingen, geen uitgerekte telefoonpagina:
          - Mobiel (< md): volle breedte, één kolom — de vertrouwde "telefoon-app"-flow.
          - Desktop (>= md): een vaste zijbalk met navigatie, en de inhoud
            gebruikt de volledige resterende breedte. Elke pagina bepaalt zelf
            hoe die breedte wordt ingevuld (bv. het hoofdscherm met een brede
            tegel-indeling), in plaats van overal dezelfde smalle kaart te tonen.
        */}
        <div className="md:flex md:min-h-screen">
          {gebruiker && gebruiker.rol && (
            <AppSidebar
              gebruiker={{ naam: gebruiker.naam, email: gebruiker.email, rol: gebruiker.rol }}
              openAfroepen={openAfroepen}
            />
          )}
          <div className="md:flex-1 md:min-w-0">
            <InstallBanner />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
