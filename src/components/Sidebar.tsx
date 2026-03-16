"use client";

import React, { useState, useEffect } from "react";
import {
  Ship, Anchor, LayoutDashboard, Settings, CalendarPlus,
  ChevronRight, ChevronDown, History, Circle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import NavireModal from "./NavireModal";
import VoyageModal from "./VoyageModal";

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

  // Sort years descending
  return Object.entries(tree)
    .sort(([a], [b]) => (b === "Sans date" ? -1 : a === "Sans date" ? 1 : Number(b) - Number(a)))
    .map(([year, months]) => ({
      year,
      months: Object.entries(months).map(([month, voyages]) => ({ month, voyages })),
    }));
}

export default function Sidebar({ onRefresh }: SidebarProps) {
  const [showNavireModal, setShowNavireModal] = useState(false);
  const [showVoyageModal, setShowVoyageModal] = useState(false);
  const [voyages, setVoyages] = useState<VoyageItem[]>([]);
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchVoyages();
    window.addEventListener("refresh-data", fetchVoyages);
    return () => window.removeEventListener("refresh-data", fetchVoyages);
  }, []);

  const fetchVoyages = async () => {
    const res = await fetch("/api/voyages");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setVoyages(data);
    }
  };

  const toggleYear = (year: string) =>
    setOpenYears(prev => ({ ...prev, [year]: !prev[year] }));
  const toggleMonth = (key: string) =>
    setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

  const tree = buildTree(voyages);

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-72 bg-white/40 backdrop-blur-xl border-r border-white/40 z-50 flex flex-col p-6 shadow-2xl shadow-blue-500/5 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2 flex-shrink-0">
          <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20 ring-4 ring-primary/5">
            <Anchor className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tighter leading-none">OOCL</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Export BL Tracker</p>
          </div>
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 -mr-1">
          {/* Principal */}
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 flex items-center gap-2">
            <span className="w-4 h-[1px] bg-gray-200"></span> Principal <span className="flex-1 h-[1px] bg-gray-200"></span>
          </div>

          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('filter-voyage', { detail: { id: null } }))}
            className="w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 transition-all border border-white/10 group"
          >
            <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Dashboard
          </button>

          {/* Gestion */}
          <div className="pt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 flex items-center gap-2">
            <span className="w-4 h-[1px] bg-gray-200"></span> Gestion <span className="flex-1 h-[1px] bg-gray-200"></span>
          </div>

          <button
            onClick={() => setShowNavireModal(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-gray-600 font-bold hover:bg-white hover:text-primary transition-all border border-transparent hover:border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 group"
          >
            <Ship className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            Créer Navire
          </button>

          <button
            onClick={() => setShowVoyageModal(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-gray-600 font-bold hover:bg-white hover:text-primary transition-all border border-transparent hover:border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 group"
          >
            <CalendarPlus className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
            Créer Voyage
          </button>

          {/* Historique Navire */}
          <div className="pt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 flex items-center gap-2">
            <span className="w-4 h-[1px] bg-gray-200"></span> Historique Navire <span className="flex-1 h-[1px] bg-gray-200"></span>
          </div>

          {voyages.length === 0 ? (
            <p className="text-xs text-gray-400 italic px-5 py-2">Aucun voyage enregistré</p>
          ) : (
            <div className="space-y-1">
              {tree.map(({ year, months }) => (
                <div key={year}>
                  {/* Year node */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/70 transition-all text-gray-700 font-bold text-sm group"
                  >
                    {openYears[year]
                      ? <ChevronDown className="w-4 h-4 text-primary flex-shrink-0 transition-transform" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" />}
                    <History className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span>{year}</span>
                  </button>

                  {openYears[year] && (
                    <div className="ml-4 border-l border-gray-100 pl-3 space-y-0.5">
                      {months.map(({ month, voyages: mvoyages }) => {
                        const monthKey = `${year}-${month}`;
                        return (
                          <div key={month}>
                            {/* Month node */}
                            <button
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/70 transition-all text-gray-600 font-semibold text-xs capitalize group"
                            >
                              {openMonths[monthKey]
                                ? <ChevronDown className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                              <span>{month}</span>
                              <span className="ml-auto bg-blue-100 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                {mvoyages.length}
                              </span>
                            </button>

                            {openMonths[monthKey] && (
                              <div className="ml-4 border-l border-gray-100 pl-2 space-y-0.5 pb-1">
                                {mvoyages.map((v) => (
                                  <button
                                    key={v.id}
                                    onClick={() => {
                                      window.dispatchEvent(
                                        new CustomEvent("filter-voyage", { detail: { id: v.id } })
                                      );
                                    }}
                                    className="w-full flex flex-col gap-0.5 px-2 py-2 rounded-lg hover:bg-blue-50 transition-all text-left group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Circle className="w-1.5 h-1.5 text-blue-400 flex-shrink-0 group-hover:text-primary transition-colors" fill="currentColor" />
                                      <span className="font-bold text-[11px] text-gray-700 truncate group-hover:text-primary transition-colors">
                                        {v.navire?.nom ?? "—"} <span className="font-mono text-gray-400">·</span> {v.numero}
                                      </span>
                                    </div>
                                    <div className="ml-3.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center text-[9px] text-gray-500 whitespace-nowrap overflow-hidden">
                                      <span className="flex-shrink-0">ETA <span className="font-bold text-gray-700">{formatShort(v.eta)}</span></span>
                                      <span className="text-gray-300 flex-shrink-0">|</span>
                                      <span className="flex-shrink-0">ETD <span className="font-bold text-gray-700">{formatShort(v.etd)}</span></span>
                                    </div>
                                  </button>
                                ))}
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

        {/* Footer */}
        <div className="mt-4 space-y-4 flex-shrink-0">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 font-medium hover:text-gray-600 transition-all text-sm">
            <Settings className="w-4 h-4" />
            Paramètres
          </button>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100/50 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-100 rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700" />
            <p className="text-xs font-bold text-blue-600 relative z-10">Status Serveur</p>
            <div className="flex items-center gap-2 mt-2 relative z-10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500" />
              <span className="text-[10px] font-bold text-blue-900/60 uppercase tracking-wider">Connecté (Cloud)</span>
            </div>
          </div>
        </div>
      </aside>

      {showNavireModal && <NavireModal onClose={() => setShowNavireModal(false)} onSuccess={onRefresh} />}
      {showVoyageModal && <VoyageModal onClose={() => setShowVoyageModal(false)} onSuccess={onRefresh} />}
    </>
  );
}
