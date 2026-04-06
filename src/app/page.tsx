"use client";

import React, { useState, useEffect } from "react";
import { useVoyages } from "@/hooks/useVoyages";
import VoyageCard from "@/components/VoyageCard";
import BLEditModal from "@/components/BLEditModal";
import { FileSpreadsheet, Layers, Search, RefreshCw, Ship, Anchor, AlertCircle, ShipWheel, Clock, CalendarIcon, CloudUpload, MessageSquare, AlertTriangle, CircleSlash } from "lucide-react";
import { calculateWorkingDays, formatAmount } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import StatusBadge from "@/components/StatusBadge";

export default function Dashboard() {
  const { voyages: allVoyages, loading, error, refresh } = useVoyages();
  
  // Filtre global : uniquement les voyages à partir du 01/03/2026
  const voyages = React.useMemo(() => {
    return allVoyages.filter(v => {
      if (!v.etd) return false;
      // Comparaison de chaînes ISO ou Date
      return new Date(v.etd) >= new Date("2026-03-01");
    });
  }, [allVoyages]);

  const [editingBL, setEditingBL] = useState<{bl: any, voyage: any} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeVoyageId, setActiveVoyageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"default" | "unreleased" | "critical" | "no-scanned" | "unrated" | "no-freight" | "with-notes">("default");

  const flatBLs = React.useMemo(() => {
    if (viewMode === "default") return [];
    
    let all: Array<{ bl: any, voyage: any, daysSinceETD: number | null }> = [];
    voyages.forEach(v => {
      v.bls.forEach((bl: any) => {
        const days = v.etdConfirmed && v.etd ? calculateWorkingDays(v.etd, null) : null;
        
        if (!bl.dateRetrait) {
          if (viewMode === "unreleased") {
            all.push({ bl, voyage: v, daysSinceETD: days });
          } else if (viewMode === "critical" && v.etdConfirmed && v.etd && days !== null && days > 15) {
            all.push({ bl, voyage: v, daysSinceETD: days });
          }
        }
        
        if (viewMode === "no-scanned" && !bl.isScanne) {
          all.push({ bl, voyage: v, daysSinceETD: days });
        }
        
        if (viewMode === "unrated" && bl.statut?.toLowerCase() === "unrated") {
          all.push({ bl, voyage: v, daysSinceETD: days });
        }

        if (viewMode === "no-freight" && (!bl.statut || bl.statut.trim() === "")) {
          all.push({ bl, voyage: v, daysSinceETD: days });
        }

        if (viewMode === "with-notes" && bl.commentaire && bl.commentaire.trim() !== "" && !bl.isNoteTraitee) {
          all.push({ bl, voyage: v, daysSinceETD: days });
        }
      });
    });
    
    // Sort by daysSinceETD descending, nulls at bottom
    let sorted = all.sort((a, b) => {
      if (a.daysSinceETD === null) return 1;
      if (b.daysSinceETD === null) return -1;
      return b.daysSinceETD - a.daysSinceETD;
    });

    if (searchTerm) {
      sorted = sorted.filter(({bl, voyage}) => 
        bl.booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.shipper || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.numTimbre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (voyage.navire?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        voyage.numero.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return sorted;
  }, [voyages, viewMode, searchTerm]);

  // Listen for sidebar voyage filter events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveVoyageId(detail.id);
      setViewMode("default");
      setSearchTerm("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("filter-voyage", handler);
    return () => window.removeEventListener("filter-voyage", handler);
  }, []);

  const filteredVoyages = voyages.filter(v => {
    if (activeVoyageId) return v.id === activeVoyageId;
    
    // If in special view modes, filter voyages that have those BLs
    if (viewMode === "unreleased") {
      return v.bls.some((bl: any) => !bl.dateRetrait);
    }
    if (viewMode === "critical") {
      if (!v.etdConfirmed || !v.etd) return false;
      return v.bls.some((bl: any) => {
        if (bl.dateRetrait) return false;
        const days = calculateWorkingDays(v.etd, null);
        return days !== null && days > 15;
      });
    }
    if (viewMode === "no-scanned") {
      return v.bls.some((bl: any) => !bl.isScanne);
    }
    if (viewMode === "unrated") {
      return v.bls.some((bl: any) => bl.statut?.toLowerCase() === "unrated");
    }
    if (viewMode === "no-freight") {
      return v.bls.some((bl: any) => !bl.statut || bl.statut.trim() === "");
    }
    if (viewMode === "with-notes") {
      return v.bls.some((bl: any) => bl.commentaire && bl.commentaire.trim() !== "" && !bl.isNoteTraitee);
    }

    return (
      (v.navire?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.bls.some((bl: any) => 
        bl.booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.shipper || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.numTimbre || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  });

  const totalBLs = voyages.reduce((acc, v) => acc + v.bls.length, 0);
  const totalVoyages = voyages.length;
  const totalUnreleasedBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: any) => !bl.dateRetrait).length, 0);
  const totalNoScannedBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: any) => !bl.isScanne).length, 0);
  const totalUnratedBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: any) => bl.statut?.toLowerCase() === "unrated").length, 0);
  const totalNoFreightBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: any) => !bl.statut || bl.statut.trim() === "").length, 0);
  const totalCriticalBLs = voyages.reduce((acc, v) => {
    // Only count for voyages where ETD is confirmed and passed
    if (!v.etdConfirmed || !v.etd) return acc;
    const criticalInVoyage = v.bls.filter((bl: any) => {
      if (bl.dateRetrait) return false;
      const days = calculateWorkingDays(v.etd, null);
      return days !== null && days > 15;
    }).length;
    return acc + criticalInVoyage;
  }, 0);
  const totalWithNotesBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: any) => bl.commentaire && bl.commentaire.trim() !== "" && !bl.isNoteTraitee).length, 0);

  const resetFilters = () => {
    setSearchTerm("");
    setActiveVoyageId(null);
    setViewMode("default");
    refresh();
  };

  const isDefaultView = !activeVoyageId && !searchTerm && viewMode === "default";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Layers className="w-10 h-10 text-primary" />
            <span className="text-red-600">OOCL</span> <span className="text-primary">Suivre la relâche des connaissements</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={resetFilters} 
            className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-primary active:scale-95"
            title="Rafraîchir et réinitialiser"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search bar - full width */}
      <div className="relative group mb-32">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text"
          placeholder="Rechercher par Navire, Voyage, Booking, Timbre ou Shipper..."
          className="w-full pl-14 pr-6 py-5 bg-white/70 backdrop-blur-md border border-white/40 rounded-3xl shadow-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-lg font-medium placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => { 
            setSearchTerm(e.target.value); 
            setActiveVoyageId(null); 
          }}
        />
      </div>

      {loading && voyages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 italic">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 opacity-20" />
          <p className="text-lg">Chargement des données...</p>
        </div>
      ) : isDefaultView ? (
        <div className="space-y-12">
          {/* Bottom section: Global Stats */}
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
              <div className="bg-blue-100 p-2 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Vue Globale</h2>
            </div>
            
            <div className="space-y-10">
              {/* Row 1: Interactive Filters (Clickable Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <button 
                  onClick={() => { setViewMode("unreleased"); setActiveVoyageId(null); }}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-3 text-left cursor-pointer ${
                    (viewMode as string) === "unreleased" ? "bg-purple-50 border-purple-300 ring-2 ring-purple-100" : "bg-white border-purple-100 shadow-xl shadow-purple-500/5 hover:border-purple-300"
                  }`}
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total Non Relâchés</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-50 p-2.5 rounded-2xl flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-black text-purple-600 leading-tight">{totalUnreleasedBLs}</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setViewMode("critical"); setActiveVoyageId(null); }}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-3 text-left cursor-pointer ${
                    (viewMode as string) === "critical" ? "bg-orange-50 border-orange-300 ring-2 ring-orange-100" : "bg-white border-orange-100 shadow-xl shadow-orange-500/5 hover:border-orange-300"
                  }`}
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Non Relâchés &gt; 15J</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-50 p-2.5 rounded-2xl flex-shrink-0">
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-3xl font-black text-orange-600 leading-tight">{totalCriticalBLs}</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setViewMode("no-scanned"); setActiveVoyageId(null); }}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-3 text-left cursor-pointer ${
                    (viewMode as string) === "no-scanned" ? "bg-rose-50 border-rose-300 ring-2 ring-rose-100" : "bg-white border-rose-100 shadow-xl shadow-rose-500/5 hover:border-rose-300"
                  }`}
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Dossiers Non Scannés</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-50 p-2.5 rounded-2xl flex-shrink-0">
                      <CloudUpload className="w-5 h-5 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-rose-600 leading-tight">{totalNoScannedBLs}</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setViewMode("with-notes"); setActiveVoyageId(null); }}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-3 text-left cursor-pointer ${
                    (viewMode as string) === "with-notes" ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100" : "bg-white border-indigo-100 shadow-xl shadow-indigo-500/5 hover:border-indigo-300"
                  }`}
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Notes Internes</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-2xl flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-3xl font-black text-indigo-600 leading-tight">{totalWithNotesBLs}</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setViewMode("unrated"); setActiveVoyageId(null); }}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-3 text-left cursor-pointer ${
                    (viewMode as string) === "unrated" ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100" : "bg-white border-blue-100 shadow-xl shadow-blue-500/5 hover:border-blue-300"
                  }`}
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Statut Fret Unrated</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-2xl flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-black text-blue-600 leading-tight">{totalUnratedBLs}</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setViewMode("no-freight"); setActiveVoyageId(null); }}
                  className={`p-5 rounded-3xl border transition-all flex flex-col gap-3 text-left cursor-pointer ${
                    (viewMode as string) === "no-freight" ? "bg-slate-50 border-slate-300 ring-2 ring-slate-100" : "bg-white border-slate-100 shadow-xl shadow-slate-500/5 hover:border-slate-300"
                  }`}
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pas Encore Freté</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-2xl flex-shrink-0">
                      <CircleSlash className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-600 leading-tight">{totalNoFreightBLs}</p>
                  </div>
                </button>
              </div>

              {/* Row 2: Global Statistics (Static) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 max-w-4xl">
                <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5 flex flex-col gap-4">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">Total de BLs</p>
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl flex-shrink-0">
                      <FileSpreadsheet className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-4xl font-black text-blue-600 leading-tight">{totalBLs}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-teal-100 shadow-xl shadow-teal-500/5 flex flex-col gap-4">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">Total de Voyages</p>
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-50 p-3 rounded-2xl flex-shrink-0">
                      <ShipWheel className="w-6 h-6 text-teal-500" />
                    </div>
                    <p className="text-4xl font-black text-teal-600 leading-tight">{totalVoyages}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {(!isDefaultView || viewMode !== "default") && (
        /* Voyages List (Filtered, Mode active, or Selected) */
        <div className="space-y-10">
          {viewMode !== "default" && (
            <div className={`p-4 rounded-2xl flex justify-between items-center ${
              viewMode === "unreleased" ? "bg-purple-50 text-purple-700" : 
              viewMode === "no-scanned" ? "bg-rose-50 text-rose-700" :
              viewMode === "unrated" ? "bg-blue-50 text-blue-700" :
              viewMode === "no-freight" ? "bg-slate-50 text-slate-700" :
              viewMode === "with-notes" ? "bg-indigo-50 text-indigo-700" :
              "bg-orange-50 text-orange-700"
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {viewMode === "unreleased" ? <AlertCircle className="w-5 h-5" /> : 
                 viewMode === "no-scanned" ? <CloudUpload className="w-5 h-5" /> :
                 viewMode === "unrated" ? <AlertTriangle className="w-5 h-5" /> :
                 viewMode === "no-freight" ? <CircleSlash className="w-5 h-5" /> :
                 viewMode === "with-notes" ? <MessageSquare className="w-5 h-5" /> :
                 <Clock className="w-5 h-5" />}
                Liste: {
                  viewMode === "unreleased" ? "Tous les BL non relâchés" : 
                  viewMode === "no-scanned" ? "Tous les dossiers non scannés" :
                  viewMode === "unrated" ? "Tous les BL avec statut Unrated" :
                  viewMode === "no-freight" ? "Tous les dossiers pas encore frétés" :
                  viewMode === "with-notes" ? "Tous les BL avec notes internes" :
                  "Relâches critiques (> 15 jours)"
                }
              </div>
              <button 
                onClick={resetFilters}
                className="text-sm underline hover:opacity-70 transition-opacity"
              >
                Retour à la vue globale
              </button>
            </div>
          )}
          
          {viewMode !== "default" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {flatBLs.length > 0 ? flatBLs.map(({bl, voyage, daysSinceETD}) => (
                <div 
                  key={bl.id} 
                  onClick={() => setEditingBL({bl, voyage})}
                  className={`bg-white rounded-3xl p-6 border border-2 border-transparent shadow-xl shadow-gray-200/50 transition-all cursor-pointer group relative overflow-hidden flex flex-col ${
                    viewMode === 'critical' ? 'hover:border-orange-200 hover:shadow-orange-500/10' : 
                    viewMode === 'with-notes' ? 'hover:border-indigo-200 hover:shadow-indigo-500/10' :
                    'hover:border-purple-200 hover:shadow-purple-500/10'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${
                    viewMode === 'critical' ? 'from-orange-50 to-orange-100/50' : 
                    viewMode === 'unrated' ? 'from-blue-50 to-blue-100/50' : 
                    viewMode === 'with-notes' ? 'from-indigo-50 to-indigo-100/50' :
                    'from-purple-50 to-purple-100/50'
                  } rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform`}></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-mono font-black text-gray-900 text-xl group-hover:text-primary transition-colors">{bl.booking}</h3>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[10px] font-bold text-gray-700 max-w-[150px] truncate" title={bl.shipper}>{bl.shipper || "Sans chargeur"}</span>
                      </div>
                    </div>
                    <div className={`${
                      viewMode === 'critical' ? 'bg-orange-50 group-hover:bg-orange-500' : 
                      viewMode === 'unrated' ? 'bg-blue-50 group-hover:bg-blue-500' : 
                      viewMode === 'with-notes' ? 'bg-indigo-50 group-hover:bg-indigo-500' :
                      'bg-purple-50 group-hover:bg-purple-500'
                    } p-3 rounded-2xl transition-colors`}>
                      {viewMode === 'critical' ? (
                        <Clock className={`w-6 h-6 text-orange-500 group-hover:text-white transition-colors`} />
                      ) : viewMode === 'unrated' ? (
                        <AlertTriangle className={`w-6 h-6 text-blue-500 group-hover:text-white transition-colors`} />
                      ) : viewMode === 'with-notes' ? (
                        <MessageSquare className={`w-6 h-6 text-indigo-500 group-hover:text-white transition-colors`} />
                      ) : (
                        <AlertCircle className={`w-6 h-6 text-purple-500 group-hover:text-white transition-colors`} />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-gray-700">
                      <Ship className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-semibold truncate">{voyage.navire?.nom || "N/A"}</span>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-700 font-bold">{voyage.numero}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-700">
                      <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                      <span>ETD:</span>
                      <span className="font-bold">{voyage.etd ? format(new Date(voyage.etd), "dd/MM/yy") : "-"}</span>
                    </div>

                    {/* Note Interne */}
                    {bl.commentaire && (
                      <div className="mt-4 pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                           <MessageSquare className="w-3 h-3 text-blue-600 opacity-70" />
                           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Note Interne</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-purple-700 font-bold line-clamp-2 bg-purple-50/50 p-2 rounded-xl border border-purple-100/50">
                          {bl.commentaire}
                        </p>
                      </div>
                    )}
                  </div>
                  
                    <div className="flex justify-between items-end border-t border-gray-50 pt-5 mt-auto">
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${
                        viewMode === 'critical' ? 'text-orange-400' : 
                        viewMode === 'unrated' ? 'text-blue-400' : 
                        viewMode === 'with-notes' ? 'text-indigo-400' :
                        'text-gray-400'
                      }`}>Durée depuis ETD</span>
                      {daysSinceETD !== null ? (
                        <span className={`font-black text-2xl leading-none drop-shadow-sm ${daysSinceETD > 15 ? 'text-red-500' : daysSinceETD > 10 ? 'text-orange-500' : 'text-green-600'}`}>
                          +{daysSinceETD} <span className="text-sm font-bold opacity-70">jours</span>
                        </span>
                      ) : (
                        <span className="font-bold text-gray-400 italic text-sm">Non confirmé</span>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full p-12 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 text-gray-400 flex flex-col items-center">
                  <ShipWheel className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-bold text-gray-500">Aucun dossier trouvé</p>
                  <p className="text-sm mt-1">Tous les BLs ont été traités.</p>
                </div>
              )}
            </div>
          ) : (
            filteredVoyages.length > 0 ? (
              filteredVoyages.map((voyage) => (
                <VoyageCard 
                  key={voyage.id} 
                  voyage={voyage} 
                  onUpdate={refresh} 
                  onEditBL={(bl, v) => setEditingBL({bl, voyage: v})}
                  showBLs={voyage.id === activeVoyageId || searchTerm.length > 0}
                  searchTerm={searchTerm}
                  viewMode={viewMode}
                />
              ))
            ) : (
              <div className="glass rounded-3xl p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200">
                <div className="bg-gray-50 p-6 rounded-full mb-6">
                  <Search className="w-16 h-16 text-gray-200" />
                </div>
                <h3 className="text-2xl font-bold text-gray-400">Aucun résultat trouvé</h3>
                <p className="text-gray-400 mt-2 max-w-md">Modifiez votre recherche pour trouver le BL ou le voyage.</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Editing Modal */}
      {editingBL && (
        <BLEditModal 
          bl={editingBL.bl} 
          voyage={editingBL.voyage} 
          onClose={() => setEditingBL(null)} 
          onSave={refresh}
        />
      )}
    </div>
  );
}
