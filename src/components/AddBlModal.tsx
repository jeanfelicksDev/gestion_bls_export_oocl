"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Save, FilePlus, Upload, Plus, Trash2, Calendar, FileCheck, AlertCircle, ShipWheel, Loader2 } from "lucide-react";
import * as xlsx from "xlsx";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import { fetchSync } from "@/lib/fetchSync";

interface VoyageItem {
  id: string;
  numero: string;
  eta: string | null;
  etd: string | null;
  navire: { nom: string } | null;
}

interface BlData {
  id: string;
  booking: string;
  statut: string;
  pod: string;
  shipper: string;
  valeurFret: string;
  montantFret: string;
  statutCorrection: string;
  statutFret: string;
  numTimbre: string;
  dateRetrait: string;
  commentaire: string;
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
        statutFret: "",
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

  const parseExcelDate = (excelDate: unknown): string => {
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
        if (!bstr || typeof bstr !== "string") {
          throw new Error("Impossible de lire le fichier");
        }

        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as (string | number | undefined | null)[][];

        if (data.length < 2) return;

        const headers = data[0].map((h) => String(h || "").trim().toUpperCase());
        const getCol = (names: string[]) => headers.findIndex((h) => names.some(n => h.includes(n.toUpperCase())));

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
            statutFret: cStatut !== -1 ? String(row[cStatut] || "").trim() : "",
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
      const res = await fetchSync("/api/bls/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voyageId: selectedVoyageId, bls: validBls }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert("Erreur : " + (data.error || "Impossible de sauvegarder"));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-brand-card rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] border border-brand-border">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface/30 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center animate-pulse-ring">
              <FilePlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text tracking-tight">
                Importation de Connaissements
              </h2>
              <div className="flex items-center gap-2 mt-0.5 font-bold">
                <p className="text-[10px] text-brand-text-muted uppercase tracking-wider">
                  {bls.length} BLs en attente d'enregistrement
                </p>
                {importSuccess && (
                  <span className="flex items-center gap-1 text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black animate-bounce border border-emerald-500/20">
                    <FileCheck className="w-3 h-3" /> IMPORT RÉUSSI
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-surface rounded-full transition-all active:scale-95 text-brand-text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden p-6 md:p-8 bg-brand-bg/10 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4 items-end bg-brand-card p-5 rounded-2xl border border-brand-border">
            {/* Voyage selector */}
            <div className="col-span-12 lg:col-span-7 space-y-1.5">
              <label className="block text-[9px] font-black text-brand-text-muted uppercase tracking-widest ml-1">Sélection du Voyage Destination</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-black text-brand-text text-sm shadow-sm"
                value={selectedVoyageId}
                onChange={(e) => setSelectedVoyageId(e.target.value)}
                required
              >
                <option value="">— Veuillez choisir un navire et un voyage —</option>
                {voyages.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.navire?.nom || "—"} - Voyage {v.numero} | ETD : {v.etd ? format(new Date(v.etd), "dd/MM/yyyy") : "Non défini"}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload/Add buttons */}
            <div className="col-span-12 lg:col-span-5 flex gap-2.5">
              <button
                type="button"
                onClick={handleManualAdd}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-text font-black text-[10px] uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Saisie Manuelle
              </button>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-5 py-2.5 rounded-xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-emerald-500/5 border border-transparent"
              >
                <Upload className="w-4 h-4" />
                Excel (.xlsx)
              </button>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-brand-card rounded-3xl border border-brand-border overflow-hidden flex flex-col min-h-0 shadow-xl shadow-black/5">
            <div className="overflow-auto flex-1 scrollbar-thin">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="sticky top-0 z-10 bg-brand-surface/90 backdrop-blur-md border-b border-brand-border">
                  <tr className="text-brand-text-muted font-black uppercase tracking-widest text-[9px]">
                    <th className="px-5 py-3">N°</th>
                    <th className="px-5 py-3">Booking</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">POD</th>
                    <th className="px-5 py-3">Shipper</th>
                    <th className="px-5 py-3">Correction</th>
                    <th className="px-5 py-3">Timbre</th>
                    <th className="px-5 py-3">Date Retrait</th>
                    <th className="px-5 py-3">Note</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {bls.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-24 text-center text-brand-text-muted">
                        <div className="flex flex-col items-center opacity-40 animate-pulse">
                          <AlertCircle className="w-12 h-12 mb-3 text-brand-text-muted" />
                          <p className="text-sm font-black uppercase tracking-wider">Aucun BL en attente</p>
                          <p className="text-[10px] font-bold">Importez un Excel ou ajoutez une ligne manuelle pour commencer.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bls.map((b, i) => (
                      <tr key={b.id} className="hover:bg-brand-surface/20 transition-colors">
                        <td className="px-5 py-3 font-mono font-black text-brand-text-muted">{i + 1}</td>
                        <td className="px-5 py-3">
                          <input 
                            value={b.booking} 
                            onChange={e => handleChange(b.id, 'booking', e.target.value)} 
                            className="w-32 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none font-black text-brand-text uppercase placeholder:text-brand-text-muted/40 font-mono text-sm" 
                            placeholder="Ex : 4055..." 
                          />
                        </td>
                        <td className="px-5 py-3">
                           <StatusBadge status={b.statut} className="scale-75 origin-left" />
                        </td>
                        <td className="px-5 py-3">
                          <input 
                            value={b.pod} 
                            onChange={e => handleChange(b.id, 'pod', e.target.value)} 
                            className="w-20 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none font-bold text-brand-text-dim text-xs uppercase" 
                            placeholder="POD" 
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input 
                            value={b.shipper} 
                            onChange={e => handleChange(b.id, 'shipper', e.target.value)} 
                            className="w-48 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none font-semibold text-brand-text-dim text-xs" 
                            placeholder="Shipper..." 
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input 
                            value={b.statutCorrection} 
                            onChange={e => handleChange(b.id, 'statutCorrection', e.target.value)} 
                            className="w-24 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none font-bold text-brand-text-muted text-xs" 
                            placeholder="Statut..." 
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input 
                            value={b.numTimbre} 
                            onChange={e => handleChange(b.id, 'numTimbre', e.target.value)} 
                            className="w-24 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none font-bold text-brand-text uppercase font-mono text-xs" 
                            placeholder="Timbre" 
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input 
                            type="date" 
                            value={b.dateRetrait} 
                            onChange={e => handleChange(b.id, 'dateRetrait', e.target.value)} 
                            className="w-32 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none font-bold text-brand-text text-xs" 
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input 
                            value={b.commentaire} 
                            onChange={e => handleChange(b.id, 'commentaire', e.target.value)} 
                            className="w-48 bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none text-brand-text-muted italic text-xs" 
                            placeholder="Remarque..." 
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveBl(b.id)} 
                            className="text-brand-text-muted hover:text-red-500 transition-all p-1.5 hover:bg-brand-surface border border-transparent hover:border-brand-border rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        <div className="p-5 md:p-6 border-t border-brand-border bg-brand-surface/30 flex justify-end gap-3 sticky bottom-0 z-20">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-brand-border font-black text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-all text-[10px] uppercase tracking-wider active:scale-95"
          >
            Annuler
          </button>
          
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSaving || bls.length === 0}
            className="px-8 py-3 rounded-xl font-black text-white shadow-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 text-[10px] uppercase tracking-wider active:scale-95"
          >
             {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
             ) : (
                <Save className="w-4 h-4" />
             )}
             Enregistrer ({bls.filter(b => b.booking.length > 2).length} valides)
          </button>
        </div>

      </div>
    </div>
  );
}
