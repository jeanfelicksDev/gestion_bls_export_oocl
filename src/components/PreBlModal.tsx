"use client";

import React, { useState } from "react";
import { X, Save, ClipboardList, Plus, Trash2, AlertCircle } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { fetchSync } from "@/lib/fetchSync";

interface BlData {
  id: string; 
  booking: string;
  statut: string;
  commentaire: string;     
}

interface PreBlModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PreBlModal({ onClose, onSuccess }: PreBlModalProps) {
  const [bls, setBls] = useState<BlData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleManualAdd = () => {
    setBls(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        booking: "",
        statut: "EN ATTENTE RETRAIT",
        commentaire: "",
      }
    ]);
  };

  const handleRemoveBl = (id: string) => {
    setBls(prev => prev.filter(b => b.id !== id));
  };

  const handleChange = (id: string, field: keyof BlData, value: string) => {
    setBls(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, [field]: value };
      }
      return b;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validBls = bls.filter(b => b.booking.trim().length > 2);
    if (validBls.length === 0) {
      alert("Ajoutez au moins un BL avec un Booking valide.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchSync("/api/bls/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voyageId: null, bls: validBls }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert("Erreur: " + (data.error || "Impossible de sauvegarder"));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-brand-card rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] border border-white/20">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-brand-border flex justify-between items-center bg-brand-card sticky top-0 z-20">
          <div className="flex items-center gap-4 md:p-6">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner ring-4 ring-indigo-50/50">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-brand-text tracking-tighter">
                Pré-Saisie de Notes Internes
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                  {bls.length} Bookings en attente
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-brand-text-dim hover:bg-brand-bg rounded-full transition-all active:scale-95">
            <X className="w-8 h-8" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-4 md:p-8 bg-brand-bg/30 flex flex-col gap-4 md:p-6">
          <div className="flex justify-between items-center bg-indigo-50/50 p-4 md:p-6 rounded-3xl border border-indigo-100/50 mb-2">
            <div className="flex items-center gap-4 text-indigo-900">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm font-bold">
                    Saisissez ici les notes pour les bookings à venir. Elles seront automatiquement appliquées lors de l'import du voyage.
                </p>
            </div>
            <button
                type="button"
                onClick={handleManualAdd}
                className="px-8 py-4 rounded-3xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Ajouter Booking
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-brand-card rounded-[2.5rem] shadow-xl shadow-black/50/50 border border-brand-border overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-brand-bg/80 backdrop-blur-md">
                    {["#", "Booking", "Note Interne", ""].map((h, i) => (
                      <th key={i} className="px-5 py-4 text-brand-text-muted font-black uppercase tracking-widest border-b border-brand-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bls.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-24 text-center text-slate-300">
                        <div className="flex flex-col items-center opacity-40">
                          <ClipboardList className="w-16 h-16 mb-4" />
                          <p className="text-lg font-black uppercase tracking-tighter">Aucun booking ajouté</p>
                          <p className="text-xs font-bold font-mono text-indigo-300">CLIQUEZ SUR LE BOUTON POUR COMMENCER</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bls.map((b, i) => (
                      <tr key={b.id} className="group hover:bg-indigo-50/30 transition-all">
                        <td className="px-5 py-3 font-mono font-black text-slate-300">{i + 1}</td>
                        <td className="px-5 py-3">
                            <input 
                                value={b.booking} 
                                onChange={e => handleChange(b.id, 'booking', e.target.value)} 
                                className="w-40 bg-transparent border-b-2 border-transparent focus:border-indigo-400 focus:outline-none font-black text-brand-text uppercase placeholder:text-slate-200" 
                                placeholder="Booking..." 
                            />
                        </td>
                        <td className="px-5 py-3 flex-1">
                            <input 
                                value={b.commentaire} 
                                onChange={e => handleChange(b.id, 'commentaire', e.target.value)} 
                                className="w-full min-w-[300px] bg-transparent border-b-2 border-transparent focus:border-indigo-400 focus:outline-none font-medium text-brand-text-dim italic" 
                                placeholder="Saisir la note interne ici..." 
                            />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={() => handleRemoveBl(b.id)} className="text-slate-200 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-10 py-6 border-t border-brand-border bg-brand-card flex justify-end gap-4 sticky bottom-0 z-20">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 py-4 rounded-2xl border-2 border-brand-border font-black text-brand-text-muted hover:bg-brand-bg hover:text-brand-text-dim transition-all text-xs uppercase tracking-widest active:scale-95"
          >
            Annuler
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSaving || bls.length === 0}
            className="px-10 py-4 rounded-2xl font-black text-white shadow-2xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-3 text-xs uppercase tracking-widest active:scale-95"
          >
             {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
                <Save className="w-5 h-5" />
             )}
             Enregistrer les notes ({bls.filter(b => b.booking.length > 2).length} valides)
          </button>
        </div>

      </div>
    </div>
  );
}
