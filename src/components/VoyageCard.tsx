"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Ship, Calendar, Clock, Edit2, CheckCircle2, Loader2, Trash2, Receipt, Plus, FileSpreadsheet, RotateCcw } from "lucide-react";
import BillingModal from "./BillingModal";
import { calculateWorkingDays } from "@/lib/utils";

interface BL {
  id: string;
  booking: string;
  pod: string;
  shipper: string;
  statut: string;
  typeConnaissement: string;
  tender: string;
  freighting: string;
  valeurFret: string;
  dateRetrait: string | null;
  autresCharges?: {
    id: string;
    type: string;
    montant: number;
    observation: string | null;
  }[];
  raisonRetour?: string | null;
  dateRetour?: string | null;
  numFactureRetour?: string | null;
}

interface Voyage {
  id: string;
  navire: { 
    nom: string;
    coque?: { nom: string } | null;
  };
  numero: string;
  eta: string | null;
  etd: string | null;
  etdConfirmed: boolean;
  bls: BL[];
}

interface VoyageCardProps {
  voyage: Voyage;
  onUpdate: () => void;
  onEditBL: (bl: BL, voyage: Voyage) => void;
  showBLs?: boolean;
  searchTerm?: string;
  viewMode?: string;
}

export default function VoyageCard({ voyage, onUpdate, onEditBL, showBLs = false, searchTerm = "", viewMode = "default" }: VoyageCardProps) {
  const voyageMatches = searchTerm && (
    (voyage.navire?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    voyage.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  const confirmETD = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/voyages/${voyage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etdConfirmed: true }),
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`ATTENTION : La suppression de ce voyage supprimera également TOUS les BLs rattachés. Voulez-vous continuer ?`)) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/voyages/${voyage.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBL = async (blId: string, booking: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le BL ${booking} ?`)) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/bls/${blId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  let displayedBLs = (searchTerm && !voyageMatches)
    ? voyage.bls.filter(bl => 
        bl.booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.shipper || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : voyage.bls;

  if (viewMode === "unreleased") {
    displayedBLs = displayedBLs.filter(bl => !bl.dateRetrait);
  } else if (viewMode === "critical") {
    displayedBLs = displayedBLs.filter(bl => {
      if (bl.dateRetrait) return false;
      if (!voyage.etdConfirmed || !voyage.etd) return false;
      const days = calculateWorkingDays(voyage.etd, null);
      return days !== null && days > 15;
    });
  }

  return (
    <div className="glass rounded-3xl overflow-hidden mb-8 border border-white/40 shadow-xl">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 text-black border-b border-blue-200/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/10 p-3 rounded-2xl">
              <Ship className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{voyage.navire?.nom || "N/A"}</h2>
                {voyage.navire?.coque && (
                  <span className="bg-blue-600/10 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-tighter font-black border border-blue-600/20 text-blue-700">
                    {voyage.navire.coque.nom}
                  </span>
                )}
              </div>
              <p className="text-gray-600 flex items-center gap-2 text-sm">
                Voyage: <span className="font-mono bg-blue-600/5 px-2 py-0.5 rounded font-bold text-gray-900">{voyage.numero}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBilling(true)}
            className="flex flex-col items-center justify-center p-3 bg-white/70 hover:bg-white text-gray-700 rounded-2xl border border-white/50 shadow-sm transition-all hover:shadow-md active:scale-95 group"
            title="Tableau de facturation"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase mt-1 text-gray-400">Facture</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm">
              <div className="bg-white/50 px-3 py-1.5 rounded-xl border border-blue-200/50 flex items-center gap-2 whitespace-nowrap">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">ETA</span>
                <span className="font-bold text-sm">{voyage.eta ? format(new Date(voyage.eta), "d MMM yy", { locale: fr }) : "-"}</span>
              </div>
              <div className="bg-white/50 px-3 py-1.5 rounded-xl border border-blue-200/50 flex items-center gap-2 whitespace-nowrap">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">ETD</span>
                <span className="font-bold text-sm">{voyage.etd ? format(new Date(voyage.etd), "d MMM yy", { locale: fr }) : "-"}</span>
              </div>
            </div>
            {voyage.etdConfirmed ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onEditBL(null as any, voyage)}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all font-bold text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter BL
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-2.5 rounded-xl transition-all border border-red-100"
                  title="Supprimer le voyage"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => onEditBL(null as any, voyage)}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all font-bold text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter BL
                </button>
                <button
                  onClick={confirmETD}
                  disabled={isUpdating}
                  className="bg-white/20 hover:bg-white text-white hover:text-primary px-4 py-2 rounded-xl backdrop-blur-md transition-all font-bold text-sm flex items-center gap-2 border border-white/20"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirmer ETD
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="bg-white/10 hover:bg-red-500 text-white p-2 rounded-xl backdrop-blur-md transition-all border border-white/20"
                  title="Supprimer le voyage"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBLs && (
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Booking</th>
                <th className="px-6 py-4">Shipper</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Retrait</th>
                <th className="px-6 py-4">Compteur</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedBLs.map((bl) => {
                const days = voyage.etdConfirmed ? calculateWorkingDays(voyage.etd, bl.dateRetrait) : null;
                
                return (
                  <tr key={bl.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-700 text-base">
                      <div className="flex items-center gap-2">
                        {bl.booking}
                        {bl.raisonRetour && (
                          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-1.5 py-1 rounded border border-orange-100 animate-pulse" title={`BL Retourné: ${bl.raisonRetour}`}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {bl.autresCharges && bl.autresCharges.length > 0 && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100" title={`${bl.autresCharges.length} charge(s) additionnelle(s)`}>
                            <Receipt className="w-3 h-3" />
                            {bl.autresCharges.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{bl.shipper}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (() => {
                          const s = bl.statut?.toUpperCase() || "";
                          if (s === "OK IMPRESSION") return "bg-green-100 text-green-700";
                          if (s.includes("ATTENTE DE OK IMPRESSION")) return "bg-blue-100 text-blue-700";
                          if (s.includes("ATTENTE CORRECTION")) return "bg-orange-100 text-orange-700";
                          return "bg-yellow-100 text-yellow-700";
                        })()
                      }`}>
                        {bl.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {bl.dateRetrait ? (
                        <span className="text-gray-700">{format(new Date(bl.dateRetrait), "dd/MM/yyyy")}</span>
                      ) : (
                        <span className="text-gray-400 italic">En attente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {days !== null && (
                        <div className={`flex items-center gap-1.5 font-bold ${
                          days > 15 ? "text-red-500" : days > 10 ? "text-orange-500" : "text-green-600"
                        }`}>
                          <Clock className="w-4 h-4" />
                          {days} {days > 1 ? "jours" : "jour"}
                        </div>
                      )}
                      {!voyage.etdConfirmed && <span className="text-gray-300 text-xs italic">ETD non confirmé</span>}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                      <button 
                        onClick={() => onEditBL(bl, voyage)}
                        className="p-2 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteBL(bl.id, bl.booking)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showBilling && (
        <BillingModal 
          voyage={voyage} 
          onClose={() => setShowBilling(false)} 
        />
      )}
    </div>
  );
}
