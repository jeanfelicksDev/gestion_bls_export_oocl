"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Ship, Plus, Check, Edit2, Trash2, Anchor, Loader2 } from "lucide-react";
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
        alert("Erreur : " + (data.error || "Impossible de créer la coque"));
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
        alert("Erreur : " + (data.error || "Impossible de sauvegarder le navire"));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur");
    } finally {
      setIsSaving(false);
    }
  };

  const labelCls = "block text-[9px] font-black text-brand-text-muted uppercase tracking-widest mb-1.5 ml-1";
  const inputCls = "w-full px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-semibold text-brand-text placeholder:text-brand-text-muted placeholder:font-normal shadow-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-card rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-brand-border">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center animate-pulse-ring">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text tracking-tight">
                {editingId ? "Modifier le Navire" : "Créer un Navire"}
              </h2>
              <p className="text-xs font-bold text-brand-text-muted mt-0.5">
                Gérez votre flotte et assignez des coques
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-surface rounded-full transition-all text-brand-text-muted active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-brand-bg/10 space-y-6">
          
          {/* Create Form */}
          <form onSubmit={handleSubmit} className="bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm space-y-5 relative overflow-hidden">
             
             <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nom du Navire</label>
                  <input 
                    autoFocus
                    className={inputCls}
                    placeholder="Ex : ONE PRESENCE"
                    value={nom}
                    onChange={(e) => setNom(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-[9px] font-black text-brand-text-muted uppercase tracking-widest mb-1.5 ml-1">
                    <span>Coque Assignée</span>
                    {coqueId && !showAddCoque && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCoque(coqueId, coques.find(c => c.id === coqueId)?.nom || "")}
                        className="text-[9px] text-red-500 hover:text-red-600 font-black flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-colors uppercase"
                      >
                        <Trash2 className="w-3 h-3" /> Supprimer la coque
                      </button>
                    )}
                  </label>
                  
                  {!showAddCoque ? (
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-semibold text-brand-text"
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
                        className="px-4.5 bg-brand-surface border border-brand-border text-brand-text font-black text-[10px] uppercase tracking-wider rounded-xl hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        <Plus className="w-4 h-4 text-primary" /> 
                        Créer
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        autoFocus
                        className="flex-1 px-4 py-2 rounded-xl border-2 border-primary bg-primary/5 focus:bg-brand-card focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-brand-text placeholder:text-brand-text-muted"
                        placeholder="Nom de la nouvelle coque..."
                        value={newCoque}
                        onChange={(e) => setNewCoque(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCoque())}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddCoque}
                        disabled={!newCoque.trim()}
                        className="px-4 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowAddCoque(false)}
                        className="px-4 bg-brand-surface border border-brand-border text-brand-text-muted rounded-xl hover:bg-brand-card transition-all flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
             </div>

             <div className="pt-2 flex gap-3">
               <button 
                  type="submit" 
                  disabled={isSaving || !nom}
                  className="flex-1 py-3 rounded-xl font-black text-white text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg bg-primary hover:bg-primary-hover shadow-primary/10 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "Mettre à jour" : "Créer le Navire"}
                </button>
                
                {editingId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingId(null); setNom(""); setCoqueId(""); }}
                    className="px-5 py-3 rounded-xl border border-brand-border text-brand-text-dim font-black text-[10px] uppercase tracking-wider hover:bg-brand-surface transition-all active:scale-95"
                  >
                    Annuler
                  </button>
                )}
             </div>
          </form>

          {/* List of registered vessels */}
          <div className="space-y-3">
            <h3 className="font-black text-brand-text-dim text-xs uppercase tracking-widest flex items-center gap-1.5 ml-1">
              ⚓ Flotte Active
              <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black py-0.5 px-2 rounded-md">
                {navires.length}
              </span>
            </h3>

            <div className="bg-brand-card rounded-2xl shadow-sm border border-brand-border overflow-hidden text-xs">
              {navires.length === 0 ? (
                <div className="p-10 text-center text-brand-text-muted flex flex-col items-center">
                  <Anchor className="w-10 h-10 mb-2 text-brand-border-highlight animate-pulse" />
                  <p className="font-semibold">Aucun navire créé.</p>
                </div>
              ) : (
                <ul className="divide-y divide-brand-border max-h-56 overflow-y-auto">
                  {navires.map((v) => (
                    <li key={v.id} className={`flex items-center justify-between p-3.5 px-5 hover:bg-brand-surface/20 transition-colors group ${editingId === v.id ? 'bg-amber-500/5' : ''}`}>
                      <div className="flex-1">
                        <p className="font-black text-brand-text text-sm uppercase">{v.nom}</p>
                        {v.coque ? (
                          <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 mt-0.5 flex items-center gap-1.5 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Coque : {v.coque.nom}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-brand-text-muted mt-0.5 flex items-center gap-1.5 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-border-highlight"></span> Sans coque
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditMode(v)}
                          className="p-1.5 text-brand-text-muted hover:text-amber-500 bg-brand-surface hover:bg-brand-card border border-brand-border rounded-lg transition-all active:scale-90"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(v.id, v.nom)}
                          className="p-1.5 text-brand-text-muted hover:text-red-500 bg-brand-surface hover:bg-brand-card border border-brand-border rounded-lg transition-all active:scale-90"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
  );
}
