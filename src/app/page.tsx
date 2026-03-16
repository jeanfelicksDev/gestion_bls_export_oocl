"use client";

import React, { useState, useEffect } from "react";
import { useVoyages } from "@/hooks/useVoyages";
import VoyageCard from "@/components/VoyageCard";
import BLEditModal from "@/components/BLEditModal";
import { FileSpreadsheet, Layers, Search, RefreshCw, Ship, Anchor, AlertCircle, ShipWheel, Clock, CalendarIcon } from "lucide-react";
import { calculateWorkingDays } from "@/lib/utils";

export default function Dashboard() {
  const { voyages, loading, error, refresh } = useVoyages();
  const [editingBL, setEditingBL] = useState<{bl: any, voyage: any} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeVoyageId, setActiveVoyageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"default" | "unreleased" | "critical">("default");

  // Listen for sidebar voyage filter events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveVoyageId(detail.id);
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

    return (
      (v.navire?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.bls.some((bl: any) => 
        bl.booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.shipper || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  });

  const totalBLs = voyages.reduce((acc, v) => acc + v.bls.length, 0);
  const totalVoyages = voyages.length;
  const totalUnreleasedBLs = voyages.reduce((acc, v) => acc + v.bls.filter((bl: any) => !bl.dateRetrait).length, 0);
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

  const pendingVoyages = voyages.map(v => {
    const unreleasedBLs = v.bls.filter((bl: any) => !bl.dateRetrait).length;
    return { ...v, unreleasedBLs, totalBLs: v.bls.length };
  }).filter(v => v.unreleasedBLs > 0).sort((a, b) => b.unreleasedBLs - a.unreleasedBLs);

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
            OOCL <span className="text-primary">BL Tracking</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Gestion et suivi des bons de connaissement export</p>
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
          placeholder="Rechercher par Navire, Voyage, Booking ou Shipper..."
          className="w-full pl-14 pr-6 py-5 bg-white/70 backdrop-blur-md border border-white/40 rounded-3xl shadow-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-lg font-medium placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => { 
            setSearchTerm(e.target.value); 
            setActiveVoyageId(null); 
            setViewMode("default");
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
          {/* Top section: Pending Voyages */}
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
              <div className="bg-orange-100 p-2 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Voyages en attente de retrait</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingVoyages.map(v => (
                <div 
                  key={v.id} 
                  onClick={() => setActiveVoyageId(v.id)}
                  className="bg-white rounded-3xl p-6 border border-2 border-transparent hover:border-orange-200 shadow-xl shadow-gray-200/50 hover:shadow-orange-500/10 transition-all cursor-pointer group relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-black text-gray-800 text-lg group-hover:text-primary transition-colors">{v.navire?.nom}</h3>
                      <p className="font-mono text-xs font-bold text-gray-400 mt-1 bg-gray-50 inline-block px-2 py-1 rounded-md">{v.numero}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-2xl group-hover:bg-orange-500 transition-colors">
                      <Anchor className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-gray-50 pt-5 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 mt-1">Total BLs</span>
                      <span className="font-bold text-gray-700 text-xl">{v.totalBLs}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase tracking-widest text-orange-500 font-bold mb-1 mt-1">Non Retirés</span>
                      <span className="font-black text-orange-600 text-3xl leading-none drop-shadow-sm">{v.unreleasedBLs}</span>
                    </div>
                  </div>
                </div>
              ))}


              {pendingVoyages.length === 0 && (
                <div className="col-span-full p-12 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 text-gray-400 flex flex-col items-center">
                  <ShipWheel className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-bold text-gray-500">Aucun voyage en attente</p>
                  <p className="text-sm mt-1">Tous les BLs ont été retirés !</p>
                </div>
              )}
            </div>
          </section>

          {/* Bottom section: Global Stats */}
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
              <div className="bg-blue-100 p-2 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Vue Globale</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5 flex items-center gap-6">
                <div className="bg-blue-50 p-4 rounded-2xl flex-shrink-0">
                  <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] mb-1">Total de BLs</p>
                  <p className="text-4xl font-black text-blue-600 leading-tight">{totalBLs}</p>
                </div>
              </div>
              
              <button 
                onClick={() => { setViewMode("unreleased"); setActiveVoyageId(null); }}
                className={`p-6 rounded-3xl border transition-all flex items-center gap-6 text-left cursor-pointer ${
                  (viewMode as string) === "unreleased" ? "bg-purple-50 border-purple-300 ring-2 ring-purple-100" : "bg-white border-purple-100 shadow-xl shadow-purple-500/5 hover:border-purple-300"
                }`}
              >
                <div className="bg-purple-50 p-4 rounded-2xl flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] mb-1">Total Non Relâchés</p>
                  <p className="text-4xl font-black text-purple-600 leading-tight">{totalUnreleasedBLs}</p>
                </div>
              </button>

              <button 
                onClick={() => { setViewMode("critical"); setActiveVoyageId(null); }}
                className={`p-6 rounded-3xl border transition-all flex items-center gap-6 text-left cursor-pointer ${
                  (viewMode as string) === "critical" ? "bg-orange-50 border-orange-300 ring-2 ring-orange-100" : "bg-white border-orange-100 shadow-xl shadow-orange-500/5 hover:border-orange-300"
                }`}
              >
                <div className="bg-orange-50 p-4 rounded-2xl flex-shrink-0">
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] mb-1">Non Relâchés &gt; 15J</p>
                  <p className="text-4xl font-black text-orange-600 leading-tight">{totalCriticalBLs}</p>
                </div>
              </button>

              <div className="bg-white p-6 rounded-3xl border border-teal-100 shadow-xl shadow-teal-500/5 flex items-center gap-6">
                <div className="bg-teal-50 p-4 rounded-2xl flex-shrink-0">
                  <ShipWheel className="w-8 h-8 text-teal-500" />
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] mb-1">Total de Voyages</p>
                  <p className="text-4xl font-black text-teal-600 leading-tight">{totalVoyages}</p>
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
              viewMode === "unreleased" ? "bg-purple-50 text-purple-700" : "bg-orange-50 text-orange-700"
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {viewMode === "unreleased" ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                Liste: {viewMode === "unreleased" ? "Tous les BL non relâchés" : "Dossiers critiques (> 15 jours)"}
              </div>
              <button 
                onClick={() => setViewMode("default")}
                className="text-sm bg-white px-3 py-1 rounded-lg shadow-sm font-bold hover:shadow transition-all"
              >
                Tout afficher
              </button>
            </div>
          )}
          
          {filteredVoyages.length > 0 ? (
            filteredVoyages.map((voyage) => (
              <VoyageCard 
                key={voyage.id} 
                voyage={voyage} 
                onUpdate={refresh} 
                onEditBL={(bl, v) => setEditingBL({bl, voyage: v})}
                showBLs={voyage.id === activeVoyageId || searchTerm.length > 0 || viewMode !== "default"}
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
