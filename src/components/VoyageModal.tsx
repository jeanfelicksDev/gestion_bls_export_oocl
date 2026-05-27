"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Calendar, Hash, Ship, Layers, Trash2, Edit2, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatAmount, unformatAmount } from "@/lib/utils";
import { fetchSync } from "@/lib/fetchSync";

interface Navire {
  id: string;
  nom: string;
  coque?: { nom: string } | null;
}

interface Voyage {
  id: string;
  navire: { nom: string; coque?: { nom: string } | null };
  numero: string;
  eta: string | null;
  etd: string | null;
  tauxDollar: string | null;
  bls: { id: string }[];
}

interface VoyageModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function VoyageModal({ onClose, onSuccess }: VoyageModalProps) {
  const [navires, setNavires] = useState<Navire[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [navireId, setNavireId] = useState("");
  const [editingVoyage, setEditingVoyage] = useState<Voyage | null>(null);
  const [numero, setNumero] = useState("");
  const [eta, setEta] = useState("");
  const [etd, setEtd] = useState("");
  const [tauxDollar, setTauxDollar] = useState("600 XOF");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSync("/api/navires").then(res => res.json()).then(data => Array.isArray(data) && setNavires(data));
    fetchVoyages();
  }, []);

  const resetForm = () => {
    setEditingVoyage(null);
    setNumero("");
    setNavireId("");
    setEta("");
    setEtd("");
    setTauxDollar("600 XOF");
  };

  const handleEdit = (v: Voyage) => {
    setEditingVoyage(v);
    setNavireId(navires.find(n => n.nom === v.navire.nom)?.id || "");
    setNumero(v.numero);
    setEta(v.eta ? format(new Date(v.eta), "yyyy-MM-dd") : "");
    setEtd(v.etd ? format(new Date(v.etd), "yyyy-MM-dd") : "");
    setTauxDollar(v.tauxDollar || "600 XOF");
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce voyage et tous ses connaissements ?")) return;
    const res = await fetchSync(`/api/voyages/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchVoyages();
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navireId || !numero || !eta || !etd) return;
    setIsSaving(true);
    try {
      const url = editingVoyage ? `/api/voyages/${editingVoyage.id}` : "/api/voyages";
      const method = editingVoyage ? "PATCH" : "POST";
      
      const res = await fetchSync(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual: true,
          navireId,
          numero,
          eta,
          etd,
          tauxDollar,
        }),
      });
      if (res.ok) {
        resetForm();
        await fetchVoyages();
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd/MM/yy", { locale: fr }) : "—";

  const labelCls = "text-[9px] font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ml-1";
  const inputCls = "w-full px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-semibold text-brand-text placeholder:text-brand-text-muted shadow-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-card rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-brand-border">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center animate-pulse-ring">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text tracking-tight">
                {editingVoyage ? "Modifier le Voyage" : "Créer un Voyage"}
              </h2>
              <p className="text-xs font-bold text-brand-text-muted mt-0.5">
                Assignez des escales de navires et suivez les départs
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-surface rounded-full transition-all text-brand-text-muted active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 md:p-8 bg-brand-bg/10 space-y-8">
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>
                  <Ship className="w-3.5 h-3.5 text-primary" /> Navire
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-semibold text-brand-text"
                  value={navireId}
                  onChange={(e) => setNavireId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un navire</option>
                  {navires.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.nom}{n.coque ? ` (${n.coque.nom})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  <Hash className="w-3.5 h-3.5 text-primary" /> N° Voyage
                </label>
                <input
                  className={inputCls}
                  placeholder="Ex : 024E"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  <Calendar className="w-3.5 h-3.5 text-secondary" /> ETA (Arrivée prévue)
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  <Calendar className="w-3.5 h-3.5 text-secondary" /> ETD (Départ prévu)
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={etd}
                  onChange={(e) => setEtd(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className={labelCls}>
                  <DollarSign className="w-3.5 h-3.5 text-red-500" /> Taux Dollar de conversion
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono font-black text-red-500 bg-brand-card w-48 text-sm shadow-sm"
                  placeholder="Ex : 600 XOF"
                  value={formatAmount(tauxDollar)}
                  onChange={(e) => setTauxDollar(unformatAmount(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving || !navireId || !numero || !eta || !etd}
                className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingVoyage ? "Mettre à jour" : "Créer le Voyage"}
              </button>
              
              <button
                type="button"
                onClick={editingVoyage ? resetForm : onClose}
                className="px-6 py-3.5 rounded-xl border border-brand-border text-brand-text-dim font-black text-[10px] uppercase tracking-wider hover:bg-brand-surface transition-all active:scale-95"
              >
                {editingVoyage ? "Annuler" : "Fermer"}
              </button>
            </div>
          </form>

          {/* Voyages table list */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-brand-text-dim uppercase tracking-widest flex items-center gap-1.5">
                Voyages enregistrés
                <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black py-0.5 px-2 rounded-md">
                  {voyages.length}
                </span>
              </h3>
            </div>

            {voyages.length === 0 ? (
              <div className="text-center py-10 text-brand-text-muted text-xs italic bg-brand-card rounded-2xl border border-brand-border">
                Aucun voyage enregistré.
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-brand-border shadow-md bg-brand-card text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-brand-surface/40 text-brand-text-muted text-[9px] font-black uppercase tracking-widest border-b border-brand-border">
                      <th className="px-4 py-3">Navire</th>
                      <th className="px-4 py-3">Coque</th>
                      <th className="px-4 py-3">Voyage</th>
                      <th className="px-4 py-3">ETA</th>
                      <th className="px-4 py-3">ETD</th>
                      <th className="px-4 py-3 text-center">BLs</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {voyages.map((v) => (
                      <tr key={v.id} className="hover:bg-brand-surface/10 transition-colors group">
                        <td className="px-4 py-3 font-black text-brand-text uppercase">{v.navire?.nom || "—"}</td>
                        <td className="px-4 py-3">
                          {v.navire?.coque ? (
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                              {v.navire.coque.nom}
                            </span>
                          ) : (
                            <span className="text-brand-text-muted italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-brand-text-dim text-xs">{v.numero}</td>
                        <td className="px-4 py-3 text-brand-text-muted">{formatDate(v.eta)}</td>
                        <td className="px-4 py-3 text-brand-text-muted">{formatDate(v.etd)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-brand-surface border border-brand-border text-brand-text-dim font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {v.bls?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              type="button"
                              onClick={() => handleEdit(v)}
                              className="p-1.5 text-brand-text-muted hover:text-amber-500 bg-brand-surface hover:bg-brand-card border border-brand-border rounded-lg transition-all active:scale-90"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id)}
                              className="p-1.5 text-brand-text-muted hover:text-red-500 bg-brand-surface hover:bg-brand-card border border-brand-border rounded-lg transition-all active:scale-90"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
