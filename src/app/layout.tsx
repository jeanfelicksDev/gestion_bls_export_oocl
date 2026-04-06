import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OOCL Suivre la relâche des connaissements",
  description: "Système de suivi des BL Export OOCL",
};

import SidebarContainer from "@/components/SidebarContainer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen antialiased bg-slate-50`}>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-blue-50 opacity-70" />
        <div className="flex">
          <SidebarContainer />
          <main className="flex-1 ml-72 p-4 md:p-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
