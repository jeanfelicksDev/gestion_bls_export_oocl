"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Save, FilePlus, Upload, Plus, Trash2, Calendar, FileCheck, AlertCircle } from "lucide-react";
import * as xlsx from "xlsx";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";

interface VoyageItem {
  id: string;
  numero: string;
  eta: string | null;
  etd: string | null;
  navire: { nom: string } | null;
}

interface BlData {
  id: string; // purely for frontend mapping
  booking: string;
  statut: string;
  pod: string;
  shipper: string;
  valeurFret: string;      // Rate(Liste)
  montantFret: string;     // Fret ABN (Montant)
  statutCorrection: string;// Statut BL(liste)
  numTimbre: string;       // Timbre
  dateRetrait: string;     // D.Retrait
  commentaire: string;     // Commentaire
}

interface AddBlModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBlModal({ onClose, onSuccess }: AddBlModalProps) {
  const [voyages, setVoyages] = useState<VoyageItem[]>([]);
  const [selectedVoyageId, setSelectedVoyageId] = useState("");
  const [bls, setBls] = useState<BlData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVoyages();
  }, []);

  const fetchVoyages = async () => {
    try {
      const res = await fetch("/api/voyages");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setVoyages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualAdd = () => {
    setBls(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        booking: "",
        statut: "EN ATTENTE RETRAIT",
        pod: "",
        shipper: "",
        valeurFret: "",
        montantFret: "",
        statutCorrection: "",
        numTimbre: "",
        dateRetrait: "",
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
        const updated = { ...b, [field]: value };
        if (field === "dateRetrait") {
          updated.statut = value ? "RETIRE" : "EN ATTENTE RETRAIT";
        }
        return updated;
      }
      return b;
    }));
  };

  const parseExcelDate = (excelDate: any) => {
    if (!excelDate) return "";
    if (typeof excelDate === 'number') {
      const d = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return d.toISOString().split('T')[0];
    }
    if (typeof excelDate === 'string') {
      const parts = excelDate.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return String(excelDate);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length < 2) return;

        const headers = data[0].map((h: any) => String(h || "").trim().toUpperCase());
        const getCol = (names: string[]) => headers.findIndex((h: string) => names.some(n => h.includes(n.toUpperCase())));

        const cBkg = getCol(["Booking", "BKG"]);
        const cPod = getCol(["POD"]);
        const cShipper = getCol(["Shipper"]);
        const cRate = getCol(["Rate"]);
        const cMontant = getCol(["Fret ABN", "Montant"]);
        const cStatut = getCol(["Statut BL", "Statut"]);
        const cTimbre = getCol(["Timbre"]);
        const cRetrait = getCol(["D.Retrait", "D RETRAIT", "RETRAIT"]);
        const cComment = getCol(["Commentaire", "Remarque"]);

        const newBls: BlData[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || cBkg === -1 || !row[cBkg]) continue;

          const dRetrait = cRetrait !== -1 ? parseExcelDate(row[cRetrait]) : "";
          newBls.push({
            id: Math.random().toString(36).substr(2, 9),
            booking: String(row[cBkg] || "").trim(),
            statut: dRetrait ? "RETIRE" : "EN ATTENTE RETRAIT",
            pod: cPod !== -1 ? String(row[cPod] || "").trim() : "",
            shipper: cShipper !== -1 ? String(row[cShipper] || "").trim() : "",
            valeurFret: cRate !== -1 ? String(row[cRate] || "").trim() : "",
            montantFret: cMontant !== -1 ? String(row[cMontant] || "").trim() : "",
            statutCorrection: cStatut !== -1 ? String(row[cStatut] || "").trim() : "",
            numTimbre: cTimbre !== -1 ? String(row[cTimbre] || "").trim() : "",
            dateRetrait: dRetrait,
            commentaire: cComment !== -1 ? String(row[cComment] || "").trim() : ""
          });
        }

        setBls(prev => [...prev, ...newBls]);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (err) {
        console.error("Import Error:", err);
        alert("Erreur lors du traitement du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoyageId) {
      alert("Veuillez sélectionner un voyage.");
      return;
    }
    
    const validBls = bls.filter(b => b.booking.trim().length > 2);
    if (validBls.length === 0) {
      alert("Ajoutez au moins un BL avec un Booking valide.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/bls/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voyageId: selectedVoyageId, bls: validBls }),
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-7xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] border border-white/20">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner ring-4 ring-emerald-50/50">
              <FilePlus className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
                Importation de BLs
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {bls.length} BLs dans la file d'attente
                </p>
                {importSuccess && (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black animate-bounce">
                    <FileCheck className="w-3 h-3" /> IMPORT RÉUSSI
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all active:scale-95">
            <X className="w-8 h-8" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-8 bg-slate-50/30 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 lg:col-span-7">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Sélection du Voyage Destination</label>
              <select 
                className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-white focus:bg-white focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 transition-all font-black text-slate-700 text-sm shadow-sm"
                value={selectedVoyageId}
                onChange={(e) => setSelectedVoyageId(e.target.value)}
                required
              >
                <option value="">— Veuillez choisir un navire et un voyage —</option>
                {voyages.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.navire?.nom || "—"} - Voyage {v.numero} | ETD: {v.etd ? format(new Date(v.etd), "dd/MM/yyyy") : "Non défini"}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 lg:col-span-5 flex gap-3">
              <button
                type="button"
                onClick={handleManualAdd}
                className="flex-[1] px-6 py-4 rounded-3xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 hover:shadow-xl hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Manuel
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-[2] px-6 py-4 rounded-3xl bg-slate-800 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Upload className="w-4 h-4" />
                Importer Excel
              </button>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/80 backdrop-blur-md">
                    {["#", "Booking", "Statut", "POD", "Shipper", "Correction", "Timbre", "D. Retrait", "Note", ""].map((h, i) => (
                      <th key={i} className="px-5 py-4 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bls.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-32 text-center text-slate-300">
                        <div className="flex flex-col items-center opacity-40">
                          <AlertCircle className="w-16 h-16 mb-4" />
                          <p className="text-lg font-black uppercase tracking-tighter">La liste est vide</p>
                          <p className="text-xs font-bold font-mono">EN ATTENTE DE DONNÉES...</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bls.map((b, i) => (
                      <tr key={b.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="px-5 py-3 font-mono font-black text-slate-300">{i + 1}</td>
                        <td className="px-5 py-3"><input value={b.booking} onChange={e => handleChange(b.id, 'booking', e.target.value)} className="w-32 bg-transparent border-b-2 border-transparent focus:border-emerald-400 focus:outline-none font-black text-slate-800 uppercase placeholder:text-slate-200" placeholder="Booking..." /></td>
                        <td className="px-5 py-3">
                           <StatusBadge status={b.statut} className="scale-75 origin-left" />
                        </td>
                        <td className="px-5 py-3"><input value={b.pod} onChange={e => handleChange(b.id, 'pod', e.target.value)} className="w-20 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none font-bold text-slate-600" placeholder="POD" /></td>
                        <td className="px-5 py-3"><input value={b.shipper} onChange={e => handleChange(b.id, 'shipper', e.target.value)} className="w-48 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none font-semibold text-slate-600 truncate" placeholder="Shipper..." /></td>

                        <td className="px-5 py-3"><input value={b.statutCorrection} onChange={e => handleChange(b.id, 'statutCorrection', e.target.value)} className="w-24 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none font-bold text-slate-500" placeholder="Statut..." /></td>
                        <td className="px-5 py-3"><input value={b.numTimbre} onChange={e => handleChange(b.id, 'numTimbre', e.target.value)} className="w-24 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none font-bold text-slate-800 uppercase" placeholder="Timbre" /></td>
                        <td className="px-5 py-3"><input type="date" value={b.dateRetrait} onChange={e => handleChange(b.id, 'dateRetrait', e.target.value)} className="w-32 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none font-bold text-slate-700" /></td>
                        <td className="px-5 py-3"><input value={b.commentaire} onChange={e => handleChange(b.id, 'commentaire', e.target.value)} className="w-48 bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none text-slate-400 italic" placeholder="Note..." /></td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={() => handleRemoveBl(b.id)} className="text-slate-200 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer shadow indicator */}
            <div className="h-6 bg-gradient-to-t from-slate-50/50 to-transparent flex-shrink-0" />
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-10 py-6 border-t border-slate-100 bg-white flex justify-end gap-4 sticky bottom-0 z-20">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 py-4 rounded-2xl border-2 border-slate-100 font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all text-xs uppercase tracking-widest active:scale-95"
          >
            Annuler
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSaving || bls.length === 0}
            className="px-10 py-4 rounded-2xl font-black text-white shadow-2xl shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-3 text-xs uppercase tracking-widest active:scale-95"
          >
             {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
                <Save className="w-5 h-5" />
             )}
             Enregistrer sur le serveur ({bls.filter(b => b.booking.length > 2).length} valides)
          </button>
        </div>

      </div>
    </div>
  );
}
