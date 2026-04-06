"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Ship, Calendar, Clock, Edit2, CheckCircle2, Loader2, Receipt, Plus, FileSpreadsheet, RotateCcw, Archive, FolderArchive, FileText, CloudUpload } from "lucide-react";
import JSZip from "jszip";
import BillingModal from "./BillingModal";
import StatusBadge from "./StatusBadge";
import { calculateWorkingDays } from "@/lib/utils";

interface BL {
  id: string;
  booking: string;
  pod: string;
  shipper: string;
  statut: string;
  typeConnaissement: string;
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
  const [isZipping, setIsZipping] = useState(false);

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
            const res = await fetch(task.url);
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
            // En cas d'erreur, on essaie quand même d'ajouter le fichier original
            try {
              const res = await fetch(task.url);
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
      link.download = `BLs_${voyage.navire.nom.replace(/\s+/g, "_")}_${voyage.numero}.zip`;
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
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAllBLs}
                  disabled={isZipping || uploadedCount === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    uploadedCount > 0 
                      ? "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700" 
                      : "bg-gray-100 text-gray-400 border border-gray-200 shadow-none"
                  }`}
                  title="Télécharger tous les BLs (ZIP)"
                >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  <span className="font-mono">{uploadedCount}/{voyage.bls.length}</span>
                </button>
                <button
                  onClick={() => onEditBL(null as any, voyage)}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all font-bold text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter BL
                </button>
                <button
                  onClick={() => setShowBilling(true)}
                  className="bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white px-4 py-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 border border-emerald-100 shadow-sm shadow-emerald-500/10 active:scale-95 group"
                >
                  <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Tableau de facturation
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAllBLs}
                  disabled={isZipping || uploadedCount === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    uploadedCount > 0 
                      ? "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700" 
                      : "bg-gray-100 text-gray-400 border border-gray-200 shadow-none"
                  }`}
                  title="Télécharger tous les BLs (ZIP)"
                >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  <span className="font-mono">{uploadedCount}/{voyage.bls.length}</span>
                </button>
                <button
                  onClick={() => onEditBL(null as any, voyage)}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all font-bold text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter BL
                </button>
                <button
                  onClick={() => setShowBilling(true)}
                   className="bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white px-4 py-2.5 rounded-xl transition-all font-bold text-sm flex items-center gap-2 border border-emerald-100 shadow-sm shadow-emerald-500/10 active:scale-95 group"
                >
                  <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Tableau de facturation
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
                    <td className="px-6 py-4 text-sm text-gray-800 font-bold max-w-[200px] truncate">{bl.shipper}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={bl.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT"} />
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
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-3">
                      {/* Status Icons */}
                      <div className="flex items-center gap-2 mr-2">
                        {/* Docs Status (OBL/SWB) */}
                        {(() => {
                          const isOblComplete = bl.typeConnaissement === "OBL" && bl.urlORG && bl.urlNNG;
                          const isSwbComplete = bl.typeConnaissement === "SWB" && bl.urlSWB;
                          const hasDocs = isOblComplete || isSwbComplete;
                          
                          return (
                            <div 
                              className={`p-1.5 rounded-lg border ${hasDocs ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-gray-50 border-gray-100 text-gray-300"}`}
                              title={hasDocs ? "Documents complets" : "Documents manquants"}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          );
                        })()}

                        {/* Scanned Folder Status */}
                        <div 
                          className={`p-1.5 rounded-lg border ${bl.urlScanne ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-gray-50 border-gray-100 text-gray-300"}`}
                          title={bl.urlScanne ? "Dossier scanné présent" : "Dossier scanné manquant"}
                        >
                          <CloudUpload className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <button 
                        onClick={() => onEditBL(bl, voyage)}
                        className="p-2 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
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
