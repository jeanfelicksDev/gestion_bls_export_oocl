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
      <div className="md:hidden fixed top-0 left-0 w-full bg-brand-card/90 backdrop-blur-md border-b border-white/10 z-30 flex items-center justify-between p-4 px-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3">
           <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
             <Anchor className="w-6 h-6 text-white" />
           </div>
           <div>
             <h1 className="text-xl font-black text-primary leading-none">OOCL</h1>
           </div>
        </div>
        <button onClick={() => setIsOpen(true)} className="p-2.5 bg-brand-surface rounded-xl text-brand-text active:scale-95 transition-transform border border-brand-border hover:bg-white/10">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Backdrop overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsOpen(false)} 
      />

      {/* Sidebar Wrapper */}
      <div className={`fixed top-0 left-0 h-screen z-[50] transition-transform duration-300 transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {isOpen && (
          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden absolute top-4 -right-14 p-2 bg-brand-card rounded-xl text-white shadow-xl border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        <Sidebar onRefresh={handleRefresh} />
      </div>
    </>
  );
}
