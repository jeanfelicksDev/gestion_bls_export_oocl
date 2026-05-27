"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { Menu, X, Anchor } from "lucide-react";

export default function SidebarContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when clicking a link theoretically, or listen to filter-voyage
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("filter-voyage", handler);
    return () => window.removeEventListener("filter-voyage", handler);
  }, []);

  const handleRefresh = () => {
    window.dispatchEvent(new Event("refresh-data"));
  };

  return (
    <>
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-brand-card/85 backdrop-blur-md border-b border-brand-border z-30 flex items-center justify-between p-4 px-6 shadow-lg shadow-black/5">
        <div className="flex items-center gap-3">
           <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 animate-pulse-ring">
             <Anchor className="w-5 h-5 text-white" />
           </div>
           <div>
             <h1 className="text-lg font-black text-brand-text leading-none tracking-tight flex items-center gap-1">
               OOCL <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-bold uppercase tracking-normal">ABJ</span>
             </h1>
           </div>
        </div>
        <button 
          onClick={() => setIsOpen(true)} 
          className="p-2 bg-brand-surface rounded-xl text-brand-text active:scale-95 transition-transform border border-brand-border hover:bg-brand-surface/80"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsOpen(false)} 
      />

      {/* Sidebar Wrapper */}
      <div className={`fixed top-0 left-0 h-screen z-[50] transition-transform duration-300 ease-out transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {isOpen && (
          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden absolute top-4 -right-14 p-2 bg-brand-card rounded-xl text-brand-text shadow-xl border border-brand-border active:scale-95 transition-all hover:bg-brand-surface"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <Sidebar onRefresh={handleRefresh} />
      </div>
    </>
  );
}
