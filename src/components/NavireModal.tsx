"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Ship, Plus, Check, Edit2, Trash2, Anchor } from "lucide-react";
import { fetchSync } from "@/lib/fetchSync";

interface Coque {
  id: string;
  nom: string;
}

interface Navire {
  id: string;
  nom: string;
  coqueId?: string | null;
  coque?: { nom: string } | null;
}

interface NavireModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NavireModal({ onClose, onSuccess }: NavireModalProps) {
  const [nom, setNom] = useState("");
  const [coqueId, setCoqueId] = useState("");
  const [coques, setCoques] = useState<Coque[]>([]);
  const [navires, setNavires] = useState<Navire[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCoque, setNewCoque] = useState("");
  const [showAddCoque, setShowAddCoque] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCoques();
    fetchNavires();
  }, []);

  const fetchCoques = async () => {
    const res = await fetchSync("/api/coques");
    if (res.ok) {
      const data = await res.json();
      setCoques(data);
    }
  };

  const fetchNavires = async () => {
    const res = await fetchSync("/api/navires");
    if (res.ok) {
      const data = await res.json();
      setNavires(data);
    }
  };

  const handleAddCoque = async () => {
    if (!newCoque.trim()) return;
    try {
      const res = await fetchSync("/api/coques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newCoque.trim() }),
      });
      if (res.ok) {
        const coque = await res.json();
        await fetchCoques();
        setCoqueId(coque.id);
        setNewCoque("");
        setShowAddCoque(false);
      } else {
        const data = await res.json();
        alert("Erreur: " + (data.error || "Impossible de créer la coque"));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ATTENTION : La suppression du navire "${name}" entraînera la suppression de TOUS les voyages et TOUS les BLs associés. Voulez-vous continuer ?`)) return;
    try {
      const res = await fetchSync(`/api/navires/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNavires();
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleDeleteCoque = async (id: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer la coque "${name}" ?`)) return;
    try {
      const res = await fetchSync(`/api/coques/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCoqueId("");
        fetchCoques();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMode = (v: Navire) => {
    setEditingId(v.id);
    setNom(v.nom);
    setCoqueId(v.coqueId || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom) return;
    setIsSaving(true);
    try {
      const url = editingId ? `/api/navires/${editingId}` : "/api/navires";
      const method = editingId ? "PATCH" : "POST";
      
      const res = await fetchSync(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, coqueId }),
      });
      if (res.ok) {
        setNom("");
        setCoqueId("");
        setEditingId(null);
        fetchNavires();
        onSuccess();
        if (!editingId) onClose();
      } else {
        const data = await res.json();
        alert("Erreur: " + (data.error || "Impossible de sauvegarder le navire"));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-brand-card rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-brand-border flex justify-between items-center bg-brand-card sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-surface text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-text tracking-tight">
                {editingId ? "Modifier le Navire" : "Créer un Navire"}
              </h2>
              <p className="text-sm font-medium text-brand-text-muted">
                Gérez votre flotte et assignez des coques
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-brand-text-muted hover:text-brand-text-dim hover:bg-brand-surface rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-4 md:p-8 bg-brand-bg/50">
          <div className="max-w-xl mx-auto space-y-10">
            {/* FORM CARD */}
            <form onSubmit={handleSubmit} className="bg-brand-card p-4 md:p-6 sm:p-4 md:p-8 rounded-[2rem] shadow-sm border border-brand-border-highlight/60 space-y-6 relative overflow-hidden">
               {/* Decorative Element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-surface rounded-bl-full -z-10 opacity-50" />
               
               <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-brand-text mb-2">Nom du Navire</label>
                    <input 
                      autoFocus
                      className="w-full px-5 py-4 rounded-2xl border-2 border-brand-border-highlight bg-brand-bg/50 focus:bg-brand-card focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-brand-text placeholder:font-normal placeholder:text-brand-text-muted"
                      placeholder="Ex: ONE PRESENCE"
                      value={nom}
                      onChange={(e) => setNom(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm font-bold text-brand-text mb-2">
                      <span>Coque Assignée</span>
                      {coqueId && !showAddCoque && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCoque(coqueId, coques.find(c => c.id === coqueId)?.nom || "")}
                          className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer la coque {coques.find(c => c.id === coqueId)?.nom}
                        </button>
                      )}
                    </label>
                    {!showAddCoque ? (
                      <div className="flex gap-3">
                        <select 
                          className="flex-1 px-5 py-4 rounded-2xl border-2 border-brand-border-highlight bg-brand-bg/50 focus:bg-brand-card focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-brand-text appearance-none"
                          value={coqueId}
                          onChange={(e) => setCoqueId(e.target.value)}
                        >
                          <option value="">Sélectionner une coque</option>
                          {coques.map(c => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                          ))}
                        </select>
                        <button 
                          type="button"
                          onClick={() => setShowAddCoque(true)}
                          className="px-6 bg-brand-card border-2 border-brand-border-highlight text-brand-text-dim rounded-2xl hover:border-blue-500 hover:text-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all flex items-center justify-center font-bold gap-2"
                        >
                          <Plus className="w-5 h-5 bg-brand-surface rounded-full p-0.5" /> 
                          <span className="hidden sm:inline">Créer</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <input 
                          autoFocus
                          className="flex-1 px-5 py-4 rounded-2xl border-2 border-blue-400 bg-brand-surface/30 focus:bg-brand-card focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-blue-400 placeholder:font-normal placeholder:text-blue-300"
                          placeholder="Nom de la nouvelle coque"
                          value={newCoque}
                          onChange={(e) => setNewCoque(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCoque())}
                        />
                        <button 
                          type="button"
                          onClick={handleAddCoque}
                          disabled={!newCoque.trim()}
                          className="px-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
                        >
                          <Check className="w-6 h-6" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowAddCoque(false)}
                          className="px-5 bg-brand-card border-2 border-brand-border-highlight text-brand-text-muted rounded-2xl hover:bg-brand-bg transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
               </div>

               <div className="pt-4 flex gap-3">
                 <button 
                    type="submit" 
                    disabled={isSaving || !nom}
                    className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-lg ${
                      editingId ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
                    } disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0`}
                  >
                    {isSaving ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      editingId ? <Edit2 className="w-5 h-5" /> : <Check className="w-6 h-6" />
                    )}
                    {editingId ? "Mettre à jour" : "Confirmer la création"}
                  </button>
                  {editingId && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingId(null); setNom(""); setCoqueId(""); }}
                      className="px-6 py-4 rounded-2xl border-2 border-brand-border-highlight text-brand-text-dim font-bold hover:bg-brand-bg transition-all"
                    >
                      Annuler
                    </button>
                  )}
               </div>
            </form>

            {/* LIST OF SHIPS CARD */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-brand-text text-lg flex items-center gap-2">
                  Flotte Enregistrée
                  <span className="bg-brand-surface text-blue-400 border border-blue-100 text-xs py-0.5 px-2.5 rounded-full font-black">
                    {navires.length}
                  </span>
                </h3>
              </div>

              <div className="bg-brand-card rounded-3xl shadow-sm border border-brand-border-highlight/60 overflow-hidden text-sm">
                {navires.length === 0 ? (
                  <div className="p-12 text-center text-brand-text-muted flex flex-col items-center">
                    <Anchor className="w-12 h-12 mb-3 text-slate-200" />
                    <p className="font-medium">Aucun navire n'a encore été créé.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {navires.map((v) => (
                      <li key={v.id} className={`flex items-center justify-between p-4 px-6 hover:bg-brand-bg transition-colors group ${editingId === v.id ? 'bg-amber-50/50' : ''}`}>
                        <div className="flex-1">
                          <p className="font-bold text-brand-text text-base">{v.nom}</p>
                          {v.coque ? (
                            <p className="text-xs font-semibold text-blue-400 mt-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Coque assignée : {v.coque.nom}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-brand-text-muted mt-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Sans coque
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditMode(v)}
                            className="p-2 w-10 h-10 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(v.id, v.nom)}
                            className="p-2 w-10 h-10 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
