"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Calendar, Hash, Ship, Layers, Trash2, Upload, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import BLUploadModal from "./BLUploadModal";

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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/navires").then(res => res.json()).then(data => Array.isArray(data) && setNavires(data));
    fetchVoyages();
  }, []);

  const resetForm = () => {
    setEditingVoyage(null);
    setNumero("");
    setNavireId("");
    setEta("");
    setEtd("");
  };

  const handleEdit = (v: Voyage) => {
    setEditingVoyage(v);
    setNavireId(navires.find(n => n.nom === v.navire.nom)?.id || "");
    setNumero(v.numero);
    setEta(v.eta ? format(new Date(v.eta), "yyyy-MM-dd") : "");
    setEtd(v.etd ? format(new Date(v.etd), "yyyy-MM-dd") : "");
  };

  const fetchVoyages = async () => {
    const res = await fetch("/api/voyages");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setVoyages(data);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce voyage ?")) return;
    const res = await fetch(`/api/voyages/${id}`, { method: "DELETE" });
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
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual: true,
          navireId,
          numero,
          eta,
          etd,
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary p-6 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-bold">{editingVoyage ? "Modifier le Voyage" : "Créer un Voyage"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Ship className="w-3 h-3" /> Navire
                </label>
                <select
                  className={`w-full px-4 py-3 rounded-xl border border-gray-100 ${navireId ? "bg-green-50" : "bg-gray-50"} focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium`}
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-3 h-3" /> N° Voyage
                </label>
                <input
                  className={`w-full px-4 py-3 rounded-xl border border-gray-100 ${numero ? "bg-green-50" : "bg-gray-50"} focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium`}
                  placeholder="Ex: 024E"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> ETA
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 rounded-xl border border-gray-100 ${eta ? "bg-green-50" : "bg-gray-50"} focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium`}
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> ETD
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 rounded-xl border border-gray-100 ${etd ? "bg-green-50" : "bg-gray-50"} focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium`}
                  value={etd}
                  onChange={(e) => setEtd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={editingVoyage ? resetForm : onClose}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                {editingVoyage ? "Annuler" : "Fermer"}
              </button>
              <button
                type="submit"
                disabled={isSaving || !navireId || !numero || !eta || !etd}
                className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isSaving ? (editingVoyage ? "Modification..." : "Création...") : (editingVoyage ? "Modifier le Voyage" : "Créer le Voyage")}
              </button>
            </div>
          </form>

          {/* Voyages table */}
          <div className="px-8 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Voyages enregistrés
                <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-black">
                  {voyages.length}
                </span>
              </h3>
            </div>

            {voyages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm italic bg-gray-50 rounded-2xl">
                Aucun voyage enregistré
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-4 py-3">Navire</th>
                      <th className="px-4 py-3">Coque</th>
                      <th className="px-4 py-3">N° Voyage</th>
                      <th className="px-4 py-3">ETA</th>
                      <th className="px-4 py-3">ETD</th>
                      <th className="px-4 py-3 text-center">BLs</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {voyages.map((v) => (
                      <tr key={v.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-4 py-3 font-semibold text-gray-800">{v.navire?.nom || "—"}</td>
                        <td className="px-4 py-3">
                          {v.navire?.coque ? (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                              {v.navire.coque.nom}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">{v.numero}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(v.eta)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(v.etd)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full text-xs">
                            {v.bls?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleEdit(v)}
                              className="p-1.5 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
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
