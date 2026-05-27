"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Ship, Anchor, LayoutDashboard, Settings, CalendarPlus,
  ChevronRight, ChevronDown, History, Circle, FilePlus,
  ClipboardList, Sun, Moon, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import NavireModal from "./NavireModal";
import VoyageModal from "./VoyageModal";
import AddBlModal from "./AddBlModal";
import PreBlModal from "./PreBlModal";
import { fetchSync } from "@/lib/fetchSync";
import { useTheme } from "./ThemeContext";

interface SidebarProps {
  onRefresh: () => void;
}

interface VoyageItem {
  id: string;
  numero: string;
  eta: string | null;
  etd: string | null;
  navire: { nom: string } | null;
}

function formatShort(d: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yy", { locale: fr });
}

// Build tree: { year -> { monthLabel -> voyages[] } }
function buildTree(voyages: VoyageItem[]) {
  const tree: Record<string, Record<string, VoyageItem[]>> = {};

  for (const v of voyages) {
    const date = v.etd ? new Date(v.etd) : null;
    const year = date ? String(date.getFullYear()) : "Sans date";
    const month = date
      ? format(date, "MMMM", { locale: fr })
      : "—";

    if (!tree[year]) tree[year] = {};
    if (!tree[year][month]) tree[year][month] = [];
    tree[year][month].push(v);
  }

  const MONTH_ORDER: Record<string, number> = {
    "janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
    "juillet": 7, "août": 8, "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12
  };

  // Sort years descending
  return Object.entries(tree)
    .sort(([a], [b]) => (b === "Sans date" ? -1 : a === "Sans date" ? 1 : Number(b) - Number(a)))
    .map(([year, months]) => ({
      year,
      months: Object.entries(months)
        .sort(([a], [b]) => {
          const orderA = MONTH_ORDER[a.toLowerCase()] || 0;
          const orderB = MONTH_ORDER[b.toLowerCase()] || 0;
          return orderB - orderA; // Descending: April, March, Feb, Jan
        })
        .map(([month, voyages]) => ({ month, voyages })),
    }));
}

export default function Sidebar({ onRefresh }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showNavireModal, setShowNavireModal] = useState(false);
  const [showVoyageModal, setShowVoyageModal] = useState(false);
  const [showAddBlModal, setShowAddBlModal] = useState(false);
  const [showPreBlModal, setShowPreBlModal] = useState(false);
  const [voyages, setVoyages] = useState<VoyageItem[]>([]);
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [activeVoyageId, setActiveVoyageId] = useState<string | null>(null);

  useEffect(() => {
    fetchVoyages();
    window.addEventListener("refresh-data", fetchVoyages);
    
    // Listen for sidebar voyage filter events
    const filterHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveVoyageId(detail.id);
    };
    window.addEventListener("filter-voyage", filterHandler);

    return () => {
      window.removeEventListener("refresh-data", fetchVoyages);
      window.removeEventListener("filter-voyage", filterHandler);
    };
  }, []);

  const fetchVoyages = async () => {
    const res = await fetchSync("/api/voyages");
    if (res.ok) {
      const data = await res.json();
      const voyagesList = Array.isArray(data)
        ? data
        : (data && typeof data === "object" && Array.isArray(data.data)
          ? data.data
          : (data && typeof data === "object" && data.data && typeof data.data === "object" && Array.isArray((data.data as any).data)
            ? (data.data as any).data
            : []));
      setVoyages(voyagesList);
    }
  };

  const toggleYear = (year: string) =>
    setOpenYears(prev => ({ ...prev, [year]: !prev[year] }));
  const toggleMonth = (key: string) =>
    setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

  const tree = buildTree(voyages.filter(v => v.etd !== null && v.etd !== undefined));

  return (
    <>
      <aside className="h-full w-72 bg-brand-surface/40 backdrop-blur-xl border-r border-brand-border z-50 flex flex-col p-4 md:p-6 shadow-2xl shadow-black/5 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2 flex-shrink-0">
          <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20 ring-4 ring-primary/5 animate-pulse-ring">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-brand-text tracking-tighter leading-none flex items-center gap-1.5">
              OOCL <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-normal">ABJ</span>
            </h1>
            <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mt-1">Export BL Tracker</p>
          </div>
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 -mr-2 scrollbar-thin">
          {/* Principal */}
          <div className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest mb-2.5 px-3 flex items-center gap-2">
            <span className="w-2.5 h-[1px] bg-brand-border-highlight"></span> Principal <span className="flex-1 h-[1px] bg-brand-border-highlight"></span>
          </div>

          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('filter-voyage', { detail: { id: null } }))}
            className={`w-full text-left flex items-center gap-3.5 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border group shadow-md active:scale-95 ${
              activeVoyageId === null 
                ? "bg-primary text-white border-primary shadow-primary/20" 
                : "bg-brand-card border-brand-border text-brand-text hover:bg-brand-surface/80"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Dashboard
          </button>

          {/* Gestion */}
          <div className="pt-5 text-[9px] font-black text-brand-text-muted uppercase tracking-widest mb-2.5 px-3 flex items-center gap-2">
            <span className="w-2.5 h-[1px] bg-brand-border-highlight"></span> Gestion <span className="flex-1 h-[1px] bg-brand-border-highlight"></span>
          </div>

          <button
            onClick={() => setShowNavireModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-brand-text font-bold text-xs uppercase tracking-wider hover:bg-brand-surface hover:text-brand-primary transition-all border border-transparent group text-left"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <Ship className="w-4 h-4" />
            </div>
            Créer Navire
          </button>

          <button
            onClick={() => setShowVoyageModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-brand-text font-bold text-xs uppercase tracking-wider hover:bg-brand-surface hover:text-brand-primary transition-all border border-transparent group text-left"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <CalendarPlus className="w-4 h-4" />
            </div>
            Créer Voyage
          </button>

          <button
            onClick={() => setShowAddBlModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-brand-text font-bold text-xs uppercase tracking-wider hover:bg-brand-surface hover:text-brand-primary transition-all border border-transparent group text-left"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <FilePlus className="w-4 h-4" />
            </div>
            Ajouter Bls
          </button>

          <button
            onClick={() => setShowPreBlModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-brand-text font-bold text-xs uppercase tracking-wider hover:bg-brand-surface hover:text-brand-primary transition-all border border-transparent group text-left"
          >
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-4 h-4" />
            </div>
            Pré-Saisie Notes
          </button>

          {/* Historique Navire */}
          <div className="pt-5 text-[9px] font-black text-brand-text-muted uppercase tracking-widest mb-2.5 px-3 flex items-center gap-2">
            <span className="w-2.5 h-[1px] bg-brand-border-highlight"></span> Historique Navires <span className="flex-1 h-[1px] bg-brand-border-highlight"></span>
          </div>

          {voyages.length === 0 ? (
            <p className="text-xs text-brand-text-muted italic px-5 py-2">Aucun voyage enregistré</p>
          ) : (
            <div className="space-y-1 px-1">
              {tree.map(({ year, months }) => (
                <div key={year} className="space-y-0.5">
                  {/* Year node */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-brand-surface/60 transition-all text-brand-text font-bold text-xs group"
                  >
                    <div className="text-brand-text-muted group-hover:text-primary transition-colors">
                      {openYears[year]
                        ? <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                        : <ChevronRight className="w-3.5 h-3.5 transition-transform" />}
                    </div>
                    <History className="w-3.5 h-3.5 text-indigo-400 opacity-80" />
                    <span className="font-semibold">{year}</span>
                  </button>

                  {openYears[year] && (
                    <div className="ml-3.5 border-l border-brand-border pl-2.5 space-y-0.5 animate-in slide-in-from-left-1 duration-200">
                      {months.map(({ month, voyages: mvoyages }) => {
                        const monthKey = `${year}-${month}`;
                        return (
                          <div key={month} className="space-y-0.5">
                            {/* Month node */}
                            <button
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-brand-surface/40 transition-all text-brand-text font-medium text-[11px] capitalize group"
                            >
                              <div className="text-brand-text-muted">
                                {openMonths[monthKey]
                                  ? <ChevronDown className="w-3 h-3" />
                                  : <ChevronRight className="w-3 h-3" />}
                              </div>
                              <span className="truncate">{month}</span>
                              <span className="ml-auto bg-brand-border-highlight text-brand-text-dim text-[8px] font-black px-1.5 py-0.5 rounded-md">
                                {mvoyages.length}
                              </span>
                            </button>

                            {openMonths[monthKey] && (
                              <div className="ml-3 border-l border-brand-border pl-2 space-y-0.5 pb-1 animate-in slide-in-from-left-1 duration-200">
                                {mvoyages.map((v) => {
                                  const isActive = activeVoyageId === v.id;
                                  return (
                                    <button
                                      key={v.id}
                                      onClick={() => {
                                        window.dispatchEvent(
                                          new CustomEvent("filter-voyage", { detail: { id: v.id } })
                                        );
                                      }}
                                      className={`w-full flex flex-col gap-0.5 px-2.5 py-2 rounded-xl transition-all text-left border relative group ${
                                        isActive 
                                          ? "bg-primary/5 border-primary/20 text-brand-text font-bold" 
                                          : "bg-transparent border-transparent hover:bg-brand-surface/30 text-brand-text-dim"
                                      }`}
                                    >
                                      {isActive && (
                                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-full glow-primary" />
                                      )}
                                      <div className="flex items-center gap-2">
                                        <Circle className={`w-1 h-1 flex-shrink-0 group-hover:text-primary transition-colors ${isActive ? 'text-primary animate-pulse' : 'text-brand-text-muted'}`} fill="currentColor" />
                                        <span className="font-bold text-[10px] truncate max-w-[170px] uppercase">
                                          {v.navire?.nom ?? "—"} <span className="text-brand-text-muted font-normal font-mono">/</span> {v.numero}
                                        </span>
                                      </div>
                                      <div className="ml-3 flex items-center text-[8px] text-brand-text-muted gap-1 whitespace-nowrap">
                                        <span>ETD <span className="font-bold text-brand-text-dim">{formatShort(v.etd)}</span></span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions & Theme toggle */}
        <div className="mt-4 pt-3 border-t border-brand-border space-y-3 flex-shrink-0">
          {/* Soleil / Lune Premium Switcher */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-brand-surface/80 border border-brand-border text-brand-text font-bold text-xs uppercase tracking-wider hover:border-brand-border-highlight transition-all active:scale-95 group shadow-sm"
            title="Changer de thème"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                {theme === "light" ? (
                  <Moon className="w-4 h-4 text-brand-accent group-hover:rotate-12 transition-transform" />
                ) : (
                  <Sun className="w-4 h-4 text-yellow-400 group-hover:rotate-45 transition-transform" />
                )}
              </div>
              <span>Mode {theme === "light" ? "Sombre" : "Clair"}</span>
            </div>
            
            {/* Visual sliding toggle switch */}
            <div className="w-7 h-4 rounded-full bg-brand-border-highlight relative flex items-center p-0.5 transition-colors">
              <div className={`w-3 h-3 rounded-full bg-primary transition-all ${theme === "dark" ? "translate-x-3 bg-secondary" : "translate-x-0"}`} />
            </div>
          </button>

          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-brand-text-muted font-bold text-xs uppercase tracking-wider hover:text-brand-text-dim transition-all text-left">
            <Settings className="w-4 h-4" />
            Paramètres
          </button>

          {/* Connected state banner */}
          <div className="bg-brand-surface/60 p-4 rounded-2xl border border-brand-border relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[8px] font-black text-brand-text-muted uppercase tracking-widest">Status Serveur</p>
            <div className="flex items-center gap-2 mt-1 relative z-10">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm glow-emerald" />
              <span className="text-[9px] font-black text-brand-text-muted uppercase tracking-wider">Connecté (Cloud)</span>
            </div>
          </div>
        </div>
      </aside>

      {typeof document !== "undefined" && createPortal(
        <>
          {showNavireModal && <NavireModal onClose={() => setShowNavireModal(false)} onSuccess={onRefresh} />}
          {showVoyageModal && <VoyageModal onClose={() => setShowVoyageModal(false)} onSuccess={onRefresh} />}
          {showAddBlModal && <AddBlModal onClose={() => setShowAddBlModal(false)} onSuccess={onRefresh} />}
          {showPreBlModal && <PreBlModal onClose={() => setShowPreBlModal(false)} onSuccess={onRefresh} />}
        </>,
        document.body
      )}
    </>
  );
}
