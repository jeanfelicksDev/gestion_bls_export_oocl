"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Ship, Calendar, Clock, Edit2, CheckCircle2, 
  Loader2, Receipt, Plus, FileSpreadsheet, RotateCcw, 
  Archive, FileText, CloudUpload, Sparkles, Check, DollarSign
} from "lucide-react";
import JSZip from "jszip";
import BillingModal from "./BillingModal";
import StatusBadge from "./StatusBadge";
import { calculateWorkingDays, formatAmount } from "@/lib/utils";
import { fetchSync } from "@/lib/fetchSync";

interface BL {
  id: string;
  booking: string;
  pod?: string | null;
  shipper?: string | null;
  statut?: string | null;
  statutFret?: string | null;
  deviseFret?: string | null;
  montantFret?: string | null;
  typeConnaissement?: string | null;
  dateRetrait?: string | Date | null;
  autresCharges?: {
    id: string;
    type: string;
    montant: string | number;
    observation?: string | null;
  }[];
  raisonRetour?: string | null;
  dateRetour?: string | null;
  numFactureRetour?: string | null;
  numTimbre?: string | null;
  commentaire?: string | null;
  // Champs documents
  urlORG?: string | null;
  urlNNG?: string | null;
  urlSWB?: string | null;
  urlScanne?: string | null;
  isORG?: boolean;
  isNNG?: boolean;
  isSWB?: boolean;
  isScanne?: boolean;
  isNoteTraitee?: boolean;
}

interface Voyage {
  id: string;
  navire: { 
    nom: string;
    coque?: { nom: string } | null;
  } | null;
  numero: string;
  eta?: string | Date | null;
  etd?: string | Date | null;
  etdConfirmed?: boolean;
  tauxDollar?: string | number | null;
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

type TabType = "bls" | "finance" | "checklist";

export default function VoyageCard({ voyage, onUpdate, onEditBL, showBLs = false, searchTerm = "", viewMode = "default" }: VoyageCardProps) {
  const voyageMatches = searchTerm && (
    (voyage.navire?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    voyage.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("bls");

  const uploadedCount = voyage.bls.filter(bl => bl.urlORG || bl.urlSWB).length;

  const handleDownloadAllBLs = async () => {
    if (uploadedCount === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      const downloadTasks = voyage.bls
        .filter(bl => bl.urlORG || bl.urlSWB)
        .flatMap(bl => {
          const tasks = [];
          if (bl.urlORG) tasks.push({ url: bl.urlORG, name: `${bl.booking}_ORG.pdf` });
          if (bl.urlSWB) tasks.push({ url: bl.urlSWB, name: `${bl.booking}_SWB.pdf` });
          return tasks;
        });

      await Promise.all(
        downloadTasks.map(async (task) => {
          try {
            const res = await fetchSync(task.url);
            const arrayBuffer = await res.arrayBuffer();
            
            const { PDFDocument } = await import("pdf-lib");
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();
            
            // Si c'est un multiple de 3 (cas standard OOCL), on ne garde que le premier tiers (1 exemplaire)
            if (totalPages >= 3 && totalPages % 3 === 0) {
              const pagesToKeep = totalPages / 3;
              const newPdfDoc = await PDFDocument.create();
              const indices = Array.from({ length: pagesToKeep }, (_, i) => i);
              const copiedPages = await newPdfDoc.copyPages(pdfDoc, indices);
              copiedPages.forEach(p => newPdfDoc.addPage(p));
              const pdfBytes = await newPdfDoc.save();
              zip.file(task.name, pdfBytes);
            } else {
              // Sinon on garde le fichier tel quel
              zip.file(task.name, arrayBuffer);
            }
          } catch (err) {
            console.error(`Erreur sur ${task.name}:`, err);
            try {
              const res = await fetchSync(task.url);
              const blob = await res.blob();
              zip.file(task.name, blob);
            } catch (e) {
              console.error("Échec complet du téléchargement pour ce fichier", e);
            }
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `BLs_${(voyage.navire?.nom ?? "INCONNU").replace(/\s+/g, "_")}_${voyage.numero}.zip`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléchargement des BLs");
    } finally {
      setIsZipping(false);
    }
  };

  const confirmETD = async () => {
    setIsUpdating(true);
    try {
      const res = await fetchSync(`/api/voyages/${voyage.id}`, {
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

  let displayedBLs = (searchTerm && !voyageMatches)
    ? voyage.bls.filter(bl => 
        bl.booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.shipper || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bl.numTimbre || "").toLowerCase().includes(searchTerm.toLowerCase())
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
  } else if (viewMode === "unrated") {
    displayedBLs = displayedBLs.filter(bl => bl.statutFret?.toLowerCase() === "unrated" || bl.statut?.toLowerCase() === "unrated");
  } else if (viewMode === "no-freight") {
    displayedBLs = displayedBLs.filter(bl => (!bl.statutFret || bl.statutFret.trim() === "") && bl.statut?.toLowerCase() !== "unrated");
  } else if (viewMode === "with-notes") {
    displayedBLs = displayedBLs.filter(bl => bl.commentaire && bl.commentaire.trim() !== "" && !bl.isNoteTraitee);
  }

  // Calculs financiers pour l'onglet Finance
  const financialSummary = React.useMemo(() => {
    let eurFreightCount = 0;
    let usdFreightCount = 0;
    let totalUSD = 0;
    let totalEUR = 0;
    let totalOtherCharges = 0;

    voyage.bls.forEach(bl => {
      const isUSD = bl.deviseFret?.toString().toUpperCase() === "USD";
      const isEUR = bl.deviseFret?.toString().toUpperCase() === "EUR";
      const amount = parseFloat(bl.montantFret || "0");

      if (isUSD && amount > 0) {
        usdFreightCount++;
        totalUSD += amount;
      } else if (isEUR && amount > 0) {
        eurFreightCount++;
        totalEUR += amount;
      }

      bl.autresCharges?.forEach(ac => {
        totalOtherCharges += parseFloat(ac.montant?.toString() || "0");
      });
    });

    return { eurFreightCount, usdFreightCount, totalUSD, totalEUR, totalOtherCharges };
  }, [voyage.bls]);

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden mb-6 border border-brand-border shadow-2xl shadow-black/5">
      
      {/* --- Card Header --- */}
      <div className="p-5 md:p-6 border-b border-brand-border bg-brand-surface/30">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
          
          {/* Ship Details */}
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary animate-pulse-ring">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-brand-text leading-snug tracking-tight uppercase">{voyage.navire?.nom || "N/A"}</h2>
                {voyage.navire?.coque && (
                  <span className="bg-secondary/15 text-secondary dark:bg-secondary/20 dark:text-blue-300 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black border border-secondary/10">
                    {voyage.navire.coque.nom}
                  </span>
                )}
              </div>
              <p className="text-brand-text-muted flex items-center gap-1.5 text-xs font-bold mt-0.5">
                VOYAGE : <span className="font-mono bg-brand-border-highlight px-2 py-0.5 rounded font-black text-brand-text-dim text-[11px]">{voyage.numero}</span>
              </p>
            </div>
          </div>

          {/* Voyage Dates & Core Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* ETD / ETA Badges */}
            <div className="flex gap-2">
              <div className="bg-brand-card px-3 py-1.5 rounded-xl border border-brand-border flex items-center gap-2">
                <span className="text-brand-text-muted text-[8px] uppercase font-black tracking-wider">ETA</span>
                <span className="font-black text-xs text-brand-text-dim">{voyage.eta ? format(new Date(voyage.eta), "dd/MM/yy", { locale: fr }) : "-"}</span>
              </div>
              <div className="bg-brand-card px-3 py-1.5 rounded-xl border border-brand-border flex items-center gap-2">
                <span className="text-brand-text-muted text-[8px] uppercase font-black tracking-wider">ETD</span>
                <span className="font-black text-xs text-brand-text-dim">{voyage.etd ? format(new Date(voyage.etd), "dd/MM/yy", { locale: fr }) : "-"}</span>
              </div>
            </div>

            {/* Actions list */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* ZIP Download all */}
              <button
                onClick={handleDownloadAllBLs}
                disabled={isZipping || uploadedCount === 0}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50 active:scale-95 ${
                  uploadedCount > 0 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10" 
                    : "bg-brand-surface text-brand-text-muted border border-brand-border"
                }`}
                title="Télécharger tous les PDF originaux fusionnés en ZIP"
              >
                {isZipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                <span>ZIP BLs ({uploadedCount}/{voyage.bls.length})</span>
              </button>

              {/* Add Manual BL */}
              <button
                onClick={() => onEditBL(null as any, voyage)}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl shadow-md shadow-primary/10 transition-all font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter BL
              </button>

              {/* Invoice spreadsheet */}
              <button
                onClick={() => setShowBilling(true)}
                className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-500 px-3.5 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 group"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Facturation
              </button>

              {/* ETD Confirmation toggle */}
              {!voyage.etdConfirmed && (
                <button
                  onClick={confirmETD}
                  disabled={isUpdating}
                  className="bg-brand-surface hover:bg-brand-card text-brand-text px-3.5 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-brand-border active:scale-95"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  Confirmer ETD
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- Interactive Voyage Tabs --- */}
        {showBLs && (
          <div className="flex gap-2 mt-5 border-t border-brand-border pt-4">
            <button
              onClick={() => setActiveTab("bls")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                activeTab === "bls"
                  ? "bg-primary text-white border-primary glow-primary"
                  : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
              }`}
            >
              📄 Liste des BLs ({displayedBLs.length})
            </button>
            
            <button
              onClick={() => setActiveTab("finance")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                activeTab === "finance"
                  ? "bg-primary text-white border-primary glow-primary"
                  : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
              }`}
            >
              💰 Finance & Taux ({financialSummary.usdFreightCount > 0 ? "USD+EUR" : "EUR"})
            </button>

            <button
              onClick={() => setActiveTab("checklist")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                activeTab === "checklist"
                  ? "bg-primary text-white border-primary glow-primary"
                  : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
              }`}
            >
              📊 Checklist Docs ({uploadedCount}/{voyage.bls.length})
            </button>
          </div>
        )}
      </div>

      {/* --- Card Body / Expanded View with Tabs --- */}
      {showBLs && (
        <div className="p-0 overflow-x-auto animate-in fade-in duration-300">
          
          {/* TAB 1: BLs Table list */}
          {activeTab === "bls" && (
            <table className="w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-brand-surface/40 text-brand-text-muted text-[10px] uppercase tracking-widest font-black border-b border-brand-border">
                  <th className="px-6 py-3.5">N° Booking</th>
                  <th className="px-6 py-3.5">Shipper (Chargeur)</th>
                  <th className="px-6 py-3.5">Statut Relâche</th>
                  <th className="px-6 py-3.5">Date Retrait</th>
                  <th className="px-6 py-3.5">Durée depuis ETD</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {displayedBLs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-brand-text-muted font-medium italic">
                      Aucun connaissement ne correspond à votre filtre de recherche dans ce voyage.
                    </td>
                  </tr>
                ) : (
                  displayedBLs.map((bl) => {
                    const days = voyage.etdConfirmed ? calculateWorkingDays(voyage.etd ?? null, bl.dateRetrait ?? null) : null;
                    
                    return (
                      <tr key={bl.id} className="hover:bg-brand-surface/20 transition-colors">
                        {/* Booking & special tags */}
                        <td className="px-6 py-4 font-mono font-black text-brand-text text-sm">
                          <div className="flex items-center gap-2.5">
                            <span>OOLU{bl.booking}</span>
                            {bl.raisonRetour && (
                              <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[8px] font-black border border-red-500/20 animate-pulse" title={`BL Retourné : ${bl.raisonRetour}`}>
                                <RotateCcw className="w-3 h-3" /> RETOUR
                              </span>
                            )}
                            {bl.autresCharges && bl.autresCharges.length > 0 && (
                              <span className="inline-flex items-center gap-1 bg-brand-surface border border-brand-border text-brand-text-dim px-1.5 py-0.5 rounded text-[8px] font-black" title={`${bl.autresCharges.length} charge(s) additionnelle(s)`}>
                                <Receipt className="w-2.5 h-2.5" />
                                {bl.autresCharges.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Shipper */}
                        <td className="px-6 py-4 text-xs text-brand-text-dim font-bold max-w-[220px] truncate" title={bl.shipper || ""}>
                          {bl.shipper || <span className="italic opacity-50 font-normal">Sans chargeur</span>}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <StatusBadge status={bl.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT"} className="scale-90 origin-left" />
                        </td>

                        {/* Date retrait */}
                        <td className="px-6 py-4 text-xs font-semibold text-brand-text-dim">
                          {bl.dateRetrait ? (
                            <span>{format(new Date(bl.dateRetrait), "dd/MM/yyyy")}</span>
                          ) : (
                            <span className="text-brand-text-muted italic opacity-60">Non retiré</span>
                          )}
                        </td>

                        {/* Days counter since ETD */}
                        <td className="px-6 py-4">
                          {days !== null ? (
                            <div className={`flex items-center gap-1.5 text-xs font-black ${
                              days > 15 ? "text-red-500" : days > 10 ? "text-amber-500" : "text-emerald-500"
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              {days} {days > 1 ? "jours" : "jour"}
                            </div>
                          ) : (
                            <span className="text-brand-text-muted text-[10px] italic">Non calculable (ETD non confirmé)</span>
                          )}
                        </td>

                        {/* Quick actions & Doc checkmarks */}
                        <td className="px-6 py-4 text-right flex justify-end items-center gap-3">
                          {/* File status indicators */}
                          <div className="flex items-center gap-1.5 mr-1">
                            <div 
                              className={`p-1 rounded-md border text-[9px] font-bold ${
                                (bl.typeConnaissement === "OBL" && bl.urlORG) || (bl.typeConnaissement === "SWB" && bl.urlSWB)
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                  : "bg-brand-surface border-brand-border text-brand-text-muted opacity-40"
                              }`}
                              title={bl.urlORG || bl.urlSWB ? "Original Présent" : "Pas de fichier original"}
                            >
                              <FileText className="w-3 h-3" />
                            </div>
                            <div 
                              className={`p-1 rounded-md border text-[9px] font-bold ${
                                bl.urlScanne 
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                  : "bg-brand-surface border-brand-border text-brand-text-muted opacity-40"
                              }`}
                              title={bl.urlScanne ? "Scanné Présent" : "Pas de fichier scanné"}
                            >
                              <CloudUpload className="w-3 h-3" />
                            </div>
                          </div>

                          <button 
                            onClick={() => onEditBL(bl, voyage)}
                            className="p-1.5 text-brand-text-muted hover:text-primary transition-colors rounded-lg hover:bg-brand-surface border border-transparent hover:border-brand-border active:scale-90"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: Finance & Statistics details */}
          {activeTab === "finance" && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-surface/10 border-t border-brand-border">
              
              {/* Left Column: Totals */}
              <div className="bg-brand-card/50 border border-brand-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-primary" /> Totaux du Fret
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-surface/40 p-3.5 rounded-xl border border-brand-border">
                    <p className="text-[9px] font-black text-brand-text-muted uppercase tracking-wider">Taux de Change Dollar</p>
                    <p className="text-lg font-black text-red-500 font-mono mt-0.5">{voyage.tauxDollar || "600 XOF"}</p>
                  </div>
                  <div className="bg-brand-surface/40 p-3.5 rounded-xl border border-brand-border">
                    <p className="text-[9px] font-black text-brand-text-muted uppercase tracking-wider">Charges Additionnelles</p>
                    <p className="text-lg font-black text-brand-text-dim mt-0.5">{formatAmount(financialSummary.totalOtherCharges)} XOF</p>
                  </div>
                  <div className="bg-brand-surface/40 p-3.5 rounded-xl border border-brand-border">
                    <p className="text-[9px] font-black text-brand-text-muted uppercase tracking-wider">Fret USD Total ({financialSummary.usdFreightCount} dossiers)</p>
                    <p className="text-lg font-black text-blue-500 font-mono mt-0.5">${formatAmount(financialSummary.totalUSD)}</p>
                  </div>
                  <div className="bg-brand-surface/40 p-3.5 rounded-xl border border-brand-border">
                    <p className="text-[9px] font-black text-brand-text-muted uppercase tracking-wider">Fret EUR Total ({financialSummary.eurFreightCount} dossiers)</p>
                    <p className="text-lg font-black text-emerald-500 font-mono mt-0.5">€{formatAmount(financialSummary.totalEUR)}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual breakdown */}
              <div className="bg-brand-card/50 border border-brand-border p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5 mb-4">
                    <Sparkles className="w-4 h-4 text-emerald-500" /> Tarification & Relâche
                  </h3>
                  <p className="text-xs text-brand-text-muted font-medium leading-relaxed">
                    Le tableau ci-contre affiche les statistiques des devises et des charges annexes saisies pour ce voyage. 
                    Vous pouvez modifier le taux du dollar à tout moment dans le panneau de facturation pour mettre à jour la conversion.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-brand-border flex justify-end">
                  <button
                    onClick={() => setShowBilling(true)}
                    className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 transition-all font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Ouvrir le panneau de facturation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Documents Checklist */}
          {activeTab === "checklist" && (
            <div className="p-6 bg-brand-surface/10 border-t border-brand-border">
              <div className="bg-brand-card/50 border border-brand-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-brand-text uppercase tracking-widest flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-indigo-500" /> Checklist de conformité des connaissements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Original Docs Complete indicator */}
                  <div className="bg-brand-surface/40 p-4 rounded-xl border border-brand-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">Exemplaires Originaux</p>
                      <p className="text-xs font-bold text-brand-text-dim mt-1">Uploadez les fichiers ORG/SWB</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-2xl font-black text-indigo-500 font-mono leading-none">{uploadedCount}</p>
                      <span className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest mt-1">sur {voyage.bls.length} dossiers</span>
                    </div>
                  </div>

                  {/* Scanned Folders indicator */}
                  <div className="bg-brand-surface/40 p-4 rounded-xl border border-brand-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">Dossiers Scannés</p>
                      <p className="text-xs font-bold text-brand-text-dim mt-1">Saisie complète requise</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-2xl font-black text-blue-500 font-mono leading-none">
                        {voyage.bls.filter(bl => bl.urlScanne).length}
                      </p>
                      <span className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest mt-1">sur {voyage.bls.length} dossiers</span>
                    </div>
                  </div>

                  {/* Release readiness */}
                  <div className="bg-brand-surface/40 p-4 rounded-xl border border-brand-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">Taux de Complétude</p>
                      <p className="text-xs font-bold text-brand-text-dim mt-1">Prêt pour l'archivage</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-2xl font-black text-emerald-500 font-mono leading-none">
                        {voyage.bls.length > 0 ? Math.round((uploadedCount / voyage.bls.length) * 100) : 0}%
                      </p>
                      <span className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest mt-1">complet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
