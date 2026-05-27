"use client";

import React, { useState, useEffect } from "react";
import { useVoyages } from "@/hooks/useVoyages";
import VoyageCard from "@/components/VoyageCard";
import BLEditModal from "@/components/BLEditModal";
import { 
  FileSpreadsheet, Layers, Search, RefreshCw, Ship, 
  AlertCircle, ShipWheel, Clock, CalendarIcon, 
  CloudUpload, MessageSquare, AlertTriangle, CircleSlash, X, Sparkles
} from "lucide-react";
import { calculateWorkingDays, formatAmount } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import StatusBadge from "@/components/StatusBadge";
import { IBL, IVoyageWithBLs } from "@/lib/types";

export default function Dashboard() {
  const { voyages: allVoyages, loading, error, refresh } = useVoyages();
  
  // Filtre global : uniquement les voyages à partir de 2025
  const voyages = React.useMemo(() => {
    const filtered = (allVoyages || []).filter(v => {
      if (v.id === "pre-vessel") return true; 
      if (!v.etd) return false;
      return new Date(v.etd) >= new Date("2025-01-01");
    });
    return filtered;
  }, [allVoyages]);

  const [editingBL, setEditingBL] = useState<{bl: IBL, voyage: IVoyageWithBLs} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeVoyageId, setActiveVoyageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"default" | "unreleased" | "critical" | "no-scanned" | "unrated" | "no-freight" | "with-notes">("default");

  const flatBLs = React.useMemo(() => {
    if (viewMode === "default") return [];
    
    let all: Array<{ bl: IBL, voyage: IVoyageWithBLs, daysSinceETD: number | null }> = [];
    voyages.forEach(v => {
      v.bls.forEach((bl: IBL) => {
        const days = v.etdConfirmed && v.etd ? calculateWorkingDays(v.etd, null) : null;
        
        if (!bl.dateRetrait) {
          if (viewMode === "unreleased") {
            all.push({ bl, voyage: v, daysSinceETD: days });
          } else if (viewMode === "critical" && v.etdConfirmed && v.etd && days !== null && days > 15) {
            all.push({ bl, voyage: v, daysSinceETD: days });
          }
        }
        
        if (viewMode === "no-scanned" && !bl.isScanne) {
          const limit = new Date("2026-04-01T00:00:00Z").getTime();
          const etd = v.etd ? new Date(v.etd).getTime() : 0;
          if (etd > limit) {
            all.push({ bl, voyage: v, daysSinceETD: days });
          }
        }
        
        if (viewMode === "unrated" && (bl.statutFret?.toLowerCase() === "unrated" || bl.statut?.toLowerCase() === "unrated")) {
          all.push({ bl, voyage: v, daysSinceETD: days });
        }
        
        if (viewMode === "no-freight" && (!bl.statutFret || bl.statutFret.trim() === "") && bl.statut?.toLowerCase() !== "unrated") {
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
      return v.bls.some((bl: IBL) => !bl.dateRetrait);
    }
    if (viewMode === "critical") {
      if (!v.etdConfirmed || !v.etd) return false;
      const etd = v.etd;
      return v.bls.some((bl: IBL) => {
        if (bl.dateRetrait) return false;
        const days = calculateWorkingDays(etd, null);
        return days !== null && days > 15;
      });
    }
    if (viewMode === "no-scanned") {
      const limit = new Date("2026-04-01T00:00:00Z").getTime();
      const etd = v.etd ? new Date(v.etd).getTime() : 0;
      return etd > limit && v.bls.some((bl: IBL) => !bl.isScanne);
    }
    if (viewMode === "unrated") {
      return v.bls.some((bl: IBL) => bl.statutFret?.toLowerCase() === "unrated" || bl.statut?.toLowerCase() === "unrated");
    }
    if (viewMode === "no-freight") {
      return v.bls.some((bl: IBL) => (!bl.statutFret || bl.statutFret.trim() === "") && bl.statut?.toLowerCase() !== "unrated");
    }
    if (viewMode === "with-notes") {
      return v.bls.some((bl: IBL) => bl.commentaire && bl.commentaire.trim() !== "" && !bl.isNoteTraitee);
    }

    return (
      (v.navire?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.bls.some((bl: IBL) => 
        bl.booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.shipper || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.numTimbre || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  });

  const totalBLs = voyages.reduce((acc, v) => acc + v.bls.length, 0);
  const totalVoyages = voyages.length;
  const totalUnreleasedBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: IBL) => !bl.dateRetrait).length, 0);
  const totalNoScannedBLs = voyages.reduce((acc, v) => {
    const limit = new Date("2026-04-01T00:00:00Z").getTime();
    const etd = v.etd ? new Date(v.etd).getTime() : 0;
    if (etd <= limit) return acc;
    return acc + v.bls.filter((bl: IBL) => !bl.isScanne).length;
  }, 0);
  const totalUnratedBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: IBL) => bl.statutFret?.toLowerCase() === "unrated" || bl.statut?.toLowerCase() === "unrated").length, 0);
  const totalNoFreightBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: IBL) => (!bl.statutFret || bl.statutFret.trim() === "") && bl.statut?.toLowerCase() !== "unrated").length, 0);
  const totalCriticalBLs = voyages.reduce((acc, v) => {
    // Only count for voyages where ETD is confirmed and passed
    if (!v.etdConfirmed || !v.etd) return acc;
    const etdVal = v.etd;
    const criticalInVoyage = v.bls.filter((bl: IBL) => {
      if (bl.dateRetrait) return false;
      const days = calculateWorkingDays(etdVal, null);
      return days !== null && days > 15;
    }).length;
    return acc + criticalInVoyage;
  }, 0);
  const totalWithNotesBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: IBL) => bl.commentaire && bl.commentaire.trim() !== "" && !bl.isNoteTraitee).length, 0);

  const resetFilters = () => {
    setSearchTerm("");
    setActiveVoyageId(null);
    setViewMode("default");
    refresh();
  };

  const isDefaultView = !activeVoyageId && !searchTerm && viewMode === "default";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Error reporting */}
      {error && (
        <div className="glass-card border-red-500/20 text-red-500 p-5 rounded-2xl flex items-center gap-4 shadow-xl shadow-red-500/5">
          <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <h3 className="font-black uppercase tracking-widest text-[10px] mb-0.5">Erreur de chargement</h3>
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <button onClick={refresh} className="bg-red-500/10 hover:bg-red-500/20 p-2 rounded-xl transition-colors active:scale-95">
            <RefreshCw className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-brand-text tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" />
            <span>Suivi des Connaissements <span className="text-primary font-black">OOCL</span></span>
          </h1>
          <p className="text-xs font-bold text-brand-text-muted mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Redesign Glassmorphic Premium actif
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={resetFilters} 
            className="p-3 bg-brand-card hover:bg-brand-surface rounded-2xl border border-brand-border shadow-sm hover:shadow-md transition-all text-brand-text-muted hover:text-primary active:scale-95"
            title="Rafraîchir et réinitialiser"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-primary transition-colors w-5 h-5" />
        <input 
          type="text"
          placeholder="Rechercher un Navire, un Voyage, un Booking, un Timbre ou un Shipper..."
          className="search-input-white w-full pl-14 pr-6 py-4.5 bg-brand-card border-2 border-brand-border rounded-2xl shadow-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base font-bold text-brand-text placeholder:text-brand-text-muted"
          value={searchTerm}
          onChange={(e) => { 
            setSearchTerm(e.target.value); 
            setActiveVoyageId(null); 
          }}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")} 
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1 bg-brand-border hover:bg-brand-border-highlight rounded-lg transition-all text-brand-text-muted hover:text-brand-text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && voyages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-brand-text-muted italic">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-30 text-primary" />
          <p className="text-sm font-semibold uppercase tracking-wider">Chargement des données du port...</p>
        </div>
      ) : isDefaultView ? (
        <div className="space-y-10">
          {/* Global Stats Grid */}
          <section>
            <div className="flex items-center gap-2.5 mb-5 pb-2 border-b border-brand-border">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-brand-text uppercase tracking-wider">Vue Globale</h2>
            </div>
            
            <div className="space-y-6">
              {/* Row 1: Interactive Filters (Clickable Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* 1. Total Non Relâchés */}
                <button 
                  onClick={() => { setViewMode("unreleased"); setActiveVoyageId(null); }}
                  className={`p-4.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                    "bg-brand-card border-brand-border hover:border-purple-400"
                  }`}
                >
                  <p className="text-brand-text font-black uppercase tracking-wider text-[9px] h-8 max-w-[90%] leading-relaxed">Total Non Relâchés</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="p-2 rounded-xl flex-shrink-0 bg-purple-500/10 text-purple-500">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black text-purple-500 font-mono">{totalUnreleasedBLs}</p>
                  </div>
                </button>

                {/* 2. Non Relâchés > 15J */}
                <button 
                  onClick={() => { setViewMode("critical"); setActiveVoyageId(null); }}
                  className={`p-4.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                    "bg-brand-card border-brand-border hover:border-red-400"
                  }`}
                >
                  <p className="text-brand-text font-black uppercase tracking-wider text-[9px] h-8 max-w-[90%] leading-relaxed">Non Relâchés &gt; 15J</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="p-2 rounded-xl flex-shrink-0 bg-red-500/10 text-red-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black text-red-500 font-mono">{totalCriticalBLs}</p>
                  </div>
                </button>

                {/* 3. Dossiers Non Scannés */}
                <button 
                  onClick={() => { setViewMode("no-scanned"); setActiveVoyageId(null); }}
                  className={`p-4.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                    "bg-brand-card border-brand-border hover:border-pink-400"
                  }`}
                >
                  <p className="text-brand-text font-black uppercase tracking-wider text-[9px] h-8 max-w-[90%] leading-relaxed">Dossiers Non Scannés</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="p-2 rounded-xl flex-shrink-0 bg-pink-500/10 text-pink-500">
                      <CloudUpload className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black text-pink-500 font-mono">{totalNoScannedBLs}</p>
                  </div>
                </button>

                {/* 4. Notes Internes */}
                <button 
                  onClick={() => { setViewMode("with-notes"); setActiveVoyageId(null); }}
                  className={`p-4.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                    "bg-brand-card border-brand-border hover:border-indigo-400"
                  }`}
                >
                  <p className="text-brand-text font-black uppercase tracking-wider text-[9px] h-8 max-w-[90%] leading-relaxed">Notes Internes</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="p-2 rounded-xl flex-shrink-0 bg-indigo-500/10 text-indigo-500">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black text-indigo-500 font-mono">{totalWithNotesBLs}</p>
                  </div>
                </button>

                {/* 5. Statut Fret Unrated */}
                <button 
                  onClick={() => { setViewMode("unrated"); setActiveVoyageId(null); }}
                  className={`p-4.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                    "bg-brand-card border-brand-border hover:border-amber-400"
                  }`}
                >
                  <p className="text-brand-text font-black uppercase tracking-wider text-[9px] h-8 max-w-[90%] leading-relaxed">Fret Unrated</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="p-2 rounded-xl flex-shrink-0 bg-amber-500/10 text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black text-amber-500 font-mono">{totalUnratedBLs}</p>
                  </div>
                </button>

                {/* 6. Pas Encore Freté */}
                <button 
                  onClick={() => { setViewMode("no-freight"); setActiveVoyageId(null); }}
                  className={`p-4.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                    "bg-brand-card border-brand-border hover:border-teal-400"
                  }`}
                >
                  <p className="text-brand-text font-black uppercase tracking-wider text-[9px] h-8 max-w-[90%] leading-relaxed">Pas Encore Freté</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="p-2 rounded-xl flex-shrink-0 bg-teal-500/10 text-teal-500">
                      <CircleSlash className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black text-teal-500 font-mono">{totalNoFreightBLs}</p>
                  </div>
                </button>
              </div>

              {/* Row 2: General Statistics (Static Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div className="bg-brand-surface border border-brand-border p-4.5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">Total de BLs</p>
                      <p className="text-xs font-bold text-brand-text-dim mt-0.5">Base de données</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-brand-text font-mono">{totalBLs}</p>
                </div>

                <div className="bg-brand-surface border border-brand-border p-4.5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 p-2.5 rounded-xl text-secondary">
                      <ShipWheel className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">Total Voyages</p>
                      <p className="text-xs font-bold text-brand-text-dim mt-0.5">Navires actifs</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-brand-text font-mono">{totalVoyages}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* Main content listings (when viewMode is active or a filter is set) */}
      {(!isDefaultView || viewMode !== "default") && (
        <div className="space-y-8">
          {/* Active view header alert banner */}
          {viewMode !== "default" && (
            <div className={`p-4.5 rounded-2xl flex justify-between items-center shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
              viewMode === "unreleased" ? "bg-purple-500/10 border-purple-500/30 text-purple-500" : 
              viewMode === "no-scanned" ? "bg-pink-500/10 border-pink-500/30 text-pink-500" :
              viewMode === "unrated" ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
              viewMode === "no-freight" ? "bg-teal-500/10 border-teal-500/30 text-teal-500" :
              viewMode === "with-notes" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500" :
              "bg-red-500/10 border-red-500/30 text-red-500"
            }`}>
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider">
                {viewMode === "unreleased" ? <AlertCircle className="w-5 h-5" /> : 
                 viewMode === "no-scanned" ? <CloudUpload className="w-5 h-5" /> :
                 viewMode === "unrated" ? <AlertTriangle className="w-5 h-5" /> :
                 viewMode === "no-freight" ? <CircleSlash className="w-5 h-5" /> :
                 viewMode === "with-notes" ? <MessageSquare className="w-5 h-5" /> :
                 <Clock className="w-5 h-5" />}
                <span>
                  {viewMode === "unreleased" ? "Tous les BL non relâchés" : 
                   viewMode === "no-scanned" ? "Tous les dossiers non scannés" :
                   viewMode === "unrated" ? "Tous les BL avec statut Unrated" :
                   viewMode === "no-freight" ? "Tous les dossiers pas encore frétés" :
                   viewMode === "with-notes" ? "Tous les BL avec notes internes" :
                   "Relâches critiques (> 15 jours)"}
                </span>
                <span className="font-mono bg-brand-surface px-2 py-0.5 rounded text-[10px] ml-1">
                  {flatBLs.length} dossiers
                </span>
              </div>
              <button 
                onClick={resetFilters}
                className="text-xs underline font-bold hover:opacity-80 active:scale-95 transition-all text-brand-text flex items-center gap-1 bg-brand-surface px-3 py-1.5 rounded-lg border border-brand-border"
              >
                <X className="w-3.5 h-3.5" /> Quitter le filtre
              </button>
            </div>
          )}
          
          {viewMode !== "default" ? (
            /* Flattened BL Grid display */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {flatBLs.length > 0 ? flatBLs.map(({bl, voyage, daysSinceETD}) => (
                <div 
                  key={bl.id} 
                  onClick={() => setEditingBL({bl, voyage})}
                  className={`bg-brand-card rounded-2xl p-5 border border-brand-border-highlight shadow-lg transition-all cursor-pointer group relative overflow-hidden flex flex-col hover:scale-[1.02] hover:-translate-y-1 ${
                    viewMode === 'critical' ? 'hover:border-red-400 hover:shadow-red-500/10' : 
                    viewMode === 'with-notes' ? 'hover:border-indigo-400 hover:shadow-indigo-500/10' :
                    'hover:border-purple-400 hover:shadow-purple-500/10'
                  }`}
                >
                  {/* Frosted ambient background color */}
                  <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br -z-10 opacity-30 group-hover:scale-110 transition-transform ${
                    viewMode === 'critical' ? 'from-red-500/10 to-red-500/20' : 
                    viewMode === 'unrated' ? 'from-amber-500/10 to-amber-500/20' : 
                    viewMode === 'with-notes' ? 'from-indigo-500/10 to-indigo-500/20' :
                    'from-purple-500/10 to-purple-500/20'
                  } rounded-bl-full`}></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-mono font-black text-brand-text text-base group-hover:text-primary transition-colors tracking-tight">OOLU{bl.booking}</h3>
                      <p className="text-[10px] font-bold text-brand-text-muted truncate max-w-[130px] mt-0.5" title={bl.shipper ?? undefined}>
                        {bl.shipper || "Sans chargeur"}
                      </p>
                    </div>
                    <div className={`p-2 rounded-xl transition-colors ${
                      viewMode === 'critical' ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white' : 
                      viewMode === 'unrated' ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' : 
                      viewMode === 'with-notes' ? 'bg-indigo-50/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white' :
                      'bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white'
                    }`}>
                      {viewMode === 'critical' ? <Clock className="w-4 h-4" /> : 
                       viewMode === 'unrated' ? <AlertTriangle className="w-4 h-4" /> : 
                       viewMode === 'with-notes' ? <MessageSquare className="w-4 h-4" /> :
                       <AlertCircle className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-brand-text-dim">
                      <Ship className="w-3.5 h-3.5 opacity-60" />
                      <span className="font-bold truncate uppercase">{voyage.navire?.nom || "N/A"}</span>
                      <span className="font-mono bg-brand-border-highlight px-1.5 py-0.5 rounded text-brand-text font-black">{voyage.numero}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-brand-text-dim">
                      <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
                      <span>ETD :</span>
                      <span className="font-black">{voyage.etd ? format(new Date(voyage.etd), "dd/MM/yy") : "-"}</span>
                    </div>

                    {/* Internal Notes Preview */}
                    {bl.commentaire && (
                      <div className="mt-3 pt-3 border-t border-brand-border">
                        <div className="flex items-center gap-1.5 mb-1">
                           <MessageSquare className="w-3.5 h-3.5 text-primary opacity-80" />
                           <span className="text-[8px] font-black text-brand-text-muted uppercase tracking-widest">Note Interne</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-indigo-500 dark:text-indigo-400 font-semibold line-clamp-2 bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10">
                          {bl.commentaire}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-brand-border pt-4 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-wider font-bold mb-0.5 text-brand-text-muted">Durée depuis ETD</span>
                      {daysSinceETD !== null ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`font-black text-xl leading-none flex-shrink-0 ${daysSinceETD > 15 ? 'text-red-500' : daysSinceETD > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            +{daysSinceETD} <span className="text-xs font-bold opacity-80">jours</span>
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-brand-text-muted italic text-[11px]">Non confirmé</span>
                      )}
                    </div>
                    <div className="scale-75 origin-bottom-right">
                      <StatusBadge status={bl.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT"} />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full p-20 text-center bg-brand-surface rounded-3xl border-2 border-dashed border-brand-border text-brand-text-muted flex flex-col items-center">
                  <ShipWheel className="w-12 h-12 text-brand-border-highlight mb-4 animate-spin-ring" />
                  <p className="text-lg font-black uppercase tracking-tight text-brand-text-dim">Aucun dossier trouvé</p>
                  <p className="text-xs font-semibold mt-1">Tous les BLs pour ce filtre ont été correctement validés.</p>
                </div>
              )}
            </div>
          ) : (
            /* Voyages Standard Card listing */
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
              <div className="glass rounded-3xl p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-brand-border">
                <div className="bg-brand-surface p-6 rounded-full mb-6 border border-brand-border shadow-inner">
                  <Search className="w-12 h-12 text-brand-text-muted" />
                </div>
                <h3 className="text-xl font-black text-brand-text-dim uppercase tracking-tight">Aucun résultat trouvé</h3>
                <p className="text-brand-text-muted mt-2 max-w-sm text-sm font-medium">Modifiez vos termes de recherche pour cibler le bon connaissement ou voyage.</p>
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
