import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cheese Stock Manager",
  description: "Van Beek & De Vreugd — voorraadbeheer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      <body className="bg-cream text-ink font-sans min-h-screen">
        <div className="mx-auto max-w-md min-h-screen bg-cream shadow-xl">{children}</div>
      </body>
    </html>
  );
}
