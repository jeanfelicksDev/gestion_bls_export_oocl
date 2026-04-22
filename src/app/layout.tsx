import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OOCL Suivre la relâche des connaissements",
  description: "Système de suivi des BL Export OOCL",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OOCL BLs",
  },
};

import SidebarContainer from "@/components/SidebarContainer";
import SyncProvider from "@/components/SyncProvider";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen antialiased bg-brand-bg text-brand-text`}>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/20 via-brand-bg to-brand-accent/10 opacity-70" />
        <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,_rgba(16,185,129,0.15)_0%,_transparent_70%)] -z-20 pointer-events-none" />
        <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[radial-gradient(circle,_rgba(245,158,11,0.15)_0%,_transparent_70%)] -z-20 pointer-events-none" />
        <SyncProvider>
          <div className="flex flex-col md:flex-row">
            <SidebarContainer />
            <main className="flex-1 ml-0 md:ml-72 p-4 pt-24 md:p-8 min-h-screen">
              <div className="max-w-6xl mx-auto">
                {children}
              </div>
            </main>
          </div>
          <Toaster position="top-right" />
        </SyncProvider>
      </body>
    </html>
  );
}
