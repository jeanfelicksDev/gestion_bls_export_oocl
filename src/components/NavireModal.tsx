"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Ship, Plus, Check, Edit2, Trash2 } from "lucide-react";

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
    const res = await fetch("/api/coques");
    if (res.ok) {
      const data = await res.json();
      setCoques(data);
    }
  };

  const fetchNavires = async () => {
    const res = await fetch("/api/navires");
    if (res.ok) {
      const data = await res.json();
      setNavires(data);
    }
  };

  const handleAddCoque = async () => {
    if (!newCoque.trim()) return;
    try {
      const res = await fetch("/api/coques", {
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
      const res = await fetch(`/api/navires/${id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/coques/${id}`, { method: "DELETE" });
      if (res.ok) {
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
      
      const res = await fetch(url, {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-primary p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Ship className="w-6 h-6" />
            <h2 className="text-xl font-bold">{editingId ? "Modifier le Navire" : "Créer un Navire"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom du Navire</label>
                <input 
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border border-gray-500 ${nom ? "bg-green-50" : "bg-white"} focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-medium`}
                  placeholder="Ex: ONE PRESENCE"
                  value={nom}
                  onChange={(e) => setNom(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coque</label>
                {!showAddCoque ? (
                  <div className="flex gap-2">
                    <select 
                      className={`flex-1 px-4 py-3 rounded-xl border border-gray-500 ${coqueId ? "bg-green-50" : "bg-white"} focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium`}
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
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Ajouter une nouvelle coque"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                    <input 
                      autoFocus
                      className="flex-1 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      placeholder="Nouveau nom..."
                      value={newCoque}
                      onChange={(e) => setNewCoque(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCoque())}
                    />
                    <button 
                      type="button"
                      onClick={handleAddCoque}
                      className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-6 h-6" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowAddCoque(false)}
                      className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Coque Management Section */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestion des Coques</h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{coques.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {coques.map(c => (
                  <div key={c.id} className="group flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 shadow-sm hover:border-primary transition-all">
                    {c.nom}
                    <button 
                      type="button"
                      onClick={() => handleDeleteCoque(c.id, c.nom)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Supprimer cette coque"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>


            <div className="flex gap-4 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-400 hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={isSaving || !nom}
                className={`flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  editingId ? "bg-amber-500 hover:shadow-amber-500/30" : "bg-primary hover:shadow-primary/30"
                } disabled:opacity-50 disabled:shadow-none`}
              >
                <Save className="w-5 h-5" />
                {isSaving ? (editingId ? "Mise à jour..." : "Création...") : (editingId ? "Enregistrer les modifications" : "Créer le Navire")}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { setEditingId(null); setNom(""); setCoqueId(""); }}
                  className="px-6 py-3 rounded-xl border border-amber-200 text-amber-600 font-bold hover:bg-amber-50 transition-all"
                >
                  Annuler Modification
                </button>
              )}
            </div>
          </form>

          {/* Navire List Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex justify-between">
              Navires Enregistrés 
              <span className="text-primary">{navires.length}</span>
            </h3>
            <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-500 shadow-inner bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 shadow-sm z-10">
                  <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-500">
                    <th className="px-6 py-3">Nom du Navire</th>
                    <th className="px-6 py-3">Coque</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-500">
                  {navires.map((v) => (
                    <tr key={v.id} className={`group hover:bg-white transition-colors ${editingId === v.id ? "bg-amber-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-700">{v.nom}</div>
                      </td>
                      <td className="px-6 py-4">
                        {v.coque ? (
                          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border border-blue-100">
                            {v.coque.nom}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic text-xs">Néant</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditMode(v)}
                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(v.id, v.nom)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {navires.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">
                        Aucun navire dans la base de données.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
