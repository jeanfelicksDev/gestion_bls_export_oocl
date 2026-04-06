"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Save, Calendar, Tag, FileText, Hash, MessageSquare, Plus, Trash2, CheckCircle2, RotateCcw, AlertCircle, ShipWheel, Eye, CloudUpload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import { formatAmount, unformatAmount } from "@/lib/utils";

interface AutreCharge {
  id?: string;
  type: string;
  montant: string;
  observation: string;
}

interface TypeCharge {
  id: string;
  nom: string;
}

interface RaisonRetourOption {
  id: string;
  nom: string;
}

interface BLEditModalProps {
  bl: any;
  voyage: any;
  onClose: () => void;
  onSave: () => void;
}

const STATUT_FRET_OPTIONS = ["", "Fret_ABJ", "Fret_OK", "Unrated", "A_Revoir"];
const STATUT_CORRECTION_OPTIONS = ["", "OK_Print", "Attente_Correction", "Attente_OK"];

export default function BLEditModal({ bl, voyage, onClose, onSave }: BLEditModalProps) {
  const isNew = !bl?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<"ORG" | "NNG" | "SWB" | "SCANNE" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    booking: bl?.booking || "",
    statut: bl?.statut || (bl?.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT"),
    dateRetrait: bl?.dateRetrait ? format(new Date(bl.dateRetrait), "yyyy-MM-dd") : "",
    pod: bl?.pod || "",
    shipper: bl?.shipper || "",
    typeConnaissement: bl?.typeConnaissement || "",
    tender: bl?.tender || "",
    freighting: bl?.freighting || "",
    valeurFret: bl?.valeurFret || "",
    statutFret: bl?.statutFret || "",
    numTimbre: bl?.numTimbre || "",
    statutCorrection: bl?.statutCorrection || "",
    commentaire: bl?.commentaire || "",
    isORG: bl?.isORG || false,
    isNNG: bl?.isNNG || false,
    isSWB: bl?.isSWB || false,
    isScanne: bl?.isScanne || false,
    urlORG: bl?.urlORG || "",
    urlNNG: bl?.urlNNG || "",
    urlSWB: bl?.urlSWB || "",
    urlScanne: bl?.urlScanne || "",
    montantFret: bl?.montantFret?.toString() || "",
    deviseFret: bl?.deviseFret || "EUR",
    raisonRetour: bl?.raisonRetour || "",
    dateRetour: bl?.dateRetour ? format(new Date(bl.dateRetour), "yyyy-MM-dd") : "",
    numFactureRetour: bl?.numFactureRetour || "",
    isNoteTraitee: bl?.isNoteTraitee || false,
  });

  const [autresCharges, setAutresCharges] = useState<AutreCharge[]>(
    bl?.autresCharges || []
  );

  const [typeCharges, setTypeCharges] = useState<TypeCharge[]>([]);
  const [raisonRetourOptions, setRaisonRetourOptions] = useState<RaisonRetourOption[]>([]);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isCreatingType, setIsCreatingType] = useState(false);

  useEffect(() => {
    fetchTypeCharges();
    fetchRaisonRetourOptions();
  }, []);

  const fetchTypeCharges = async () => {
    try {
      const res = await fetch("/api/type-charges");
      if (res.ok) setTypeCharges(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchRaisonRetourOptions = async () => {
    try {
      const res = await fetch("/api/raison-retour");
      if (res.ok) setRaisonRetourOptions(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleCreateTypeCharge = async () => {
    if (!newTypeName.trim()) return;
    setIsCreatingType(true);
    try {
      const res = await fetch("/api/type-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newTypeName }),
      });
      if (res.ok) {
        await fetchTypeCharges();
        setNewTypeName("");
        setShowTypeManager(false);
      } else {
        alert("Erreur lors de la création du type");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setIsCreatingType(false);
    }
  };

  const handleToggleAndOpen = (type: "ORG" | "NNG" | "SWB" | "SCANNE") => {
    // 1. Toggle State
    const field = type === "SCANNE" ? "isScanne" : `is${type}` as keyof typeof formData;
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));

    // 2. Open PDF (Cloud URL prioritized)
    const storedUrl = formData[type === "SCANNE" ? "urlScanne" : `url${type}` as keyof typeof formData];
    if (storedUrl) {
      window.open(storedUrl, '_blank', 'noopener,noreferrer');
    } else if (formData.booking) {
      // Fallback to convention while migrating
      const fileName = `${formData.booking} ${type}.pdf`;
      const url = `/bl-files/${encodeURIComponent(fileName)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUploadClick = (type: "ORG" | "NNG" | "SWB" | "SCANNE") => {
    setActiveUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadType || !bl?.id) return;

    setIsUploading(true);
    try {
      const filename = `${formData.booking} ${activeUploadType}.pdf`;
      const res = await fetch(`/api/bls/upload?filename=${encodeURIComponent(filename)}&blId=${bl.id}&type=${activeUploadType}`, {
        method: "POST",
        body: file,
      });

      const result = await res.json();

      if (res.ok) {
        setFormData(prev => ({ 
          ...prev, 
          [activeUploadType === "SCANNE" ? "urlScanne" : `url${activeUploadType}`]: result.url,
          [activeUploadType === "SCANNE" ? "isScanne" : `is${activeUploadType}`]: true 
        }));
        alert(`Document ${activeUploadType} téléversé avec succès !`);
      } else {
        alert(`Erreur Upload : ${result.error || "Inconnue"}`);
      }
    } finally {
      setIsUploading(false);
      setActiveUploadType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (type: "ORG" | "NNG" | "SWB" | "SCANNE") => {
    const urlField = type === "SCANNE" ? "urlScanne" : `url${type}` as keyof typeof formData;
    const url = formData[urlField];
    if (!url) return;

    if (!window.confirm(`Voulez-vous vraiment supprimer définitivement le document ${type} ?`)) return;

    setIsUploading(true);
    setActiveUploadType(type);
    try {
      const res = await fetch(`/api/bls/upload?blId=${bl.id}&type=${type}&url=${encodeURIComponent(url as string)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const field = type === "SCANNE" ? "isScanne" : `is${type}` as keyof typeof formData;
        setFormData(prev => ({ ...prev, [urlField]: "", [field]: false }));
        alert("Document supprimé avec succès.");
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setIsUploading(false);
      setActiveUploadType(null);
    }
  };

  const isDateRetraitSaisie = !!formData.dateRetrait;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "dateRetrait") {
        next.statut = value ? "RETIRE" : "EN ATTENTE RETRAIT";
      }
      return next;
    });
  };

  const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const addCharge = () => {
    setAutresCharges([...autresCharges, { type: "", montant: "0", observation: "" }]);
  };

  const removeCharge = (index: number) => {
    setAutresCharges(autresCharges.filter((_, i) => i !== index));
  };

  const updateCharge = (index: number, field: keyof AutreCharge, value: string) => {
    const updated = [...autresCharges];
    const finalValue = field === "montant" ? unformatAmount(value) : value;
    updated[index] = { ...updated[index], [field]: finalValue };
    setAutresCharges(updated);
  };

  const generateReceiptPDF = async (booking: string, typeConnaissement: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 90; // Laisser 80-90mm pour la pièce d'identité en haut

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      const text1 = "Je soussigné dont pièce d'identité ci-dessus,";
      const text2 = "reconnais avoir retiré dans les locaux de OOCL/Direction des Solutions Maritimes (DSM),";
      
      let details = "";
      if (typeConnaissement === "OBL") {
        details = `Le OBL ${booking} (03 copies originales + 02 copies non négociables)`;
      } else if (typeConnaissement === "SWB") {
        details = `Le SWB ${booking} (01 copie SWB)`;
      } else {
        details = `Le « ${typeConnaissement || "type de connaissement"} » ${booking}`;
      }

      doc.text(text1, margin, y);
      y += 10;
      doc.text(text2, margin, y);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text(details, margin, y);
      
      // Bloc signature et date à droite
      y += 40;
      doc.setFont("helvetica", "bold");
      doc.text("Signature + cachet + mention « lu et approuvé »", pageWidth - margin - 85, y);
      
      y += 30;
      doc.setFont("helvetica", "normal");
      const today = format(new Date(), "dd/MM/yyyy");
      doc.text(`Abidjan, le ${today}`, pageWidth - margin - 45, y);

      // Ouvrir dans un nouvel onglet
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("Erreur PDF:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Validation : Date de retrait >= ETD
      if (formData.dateRetrait && voyage.etd) {
        const dRetrait = new Date(formData.dateRetrait);
        const dEtd = new Date(voyage.etd);
        
        // Reset hours for comparison
        dRetrait.setHours(0, 0, 0, 0);
        dEtd.setHours(0, 0, 0, 0);

        if (dRetrait < dEtd) {
          alert(`Erreur : La date de retrait (${format(dRetrait, "dd/MM/yyyy")}) ne peut pas être antérieure à la date de départ prévue (${format(dEtd, "dd/MM/yyyy")}).`);
          setIsSaving(false);
          return;
        }
      }

      // Validation : Documents obligatoires selon le type
      if (formData.typeConnaissement === "OBL") {
        if (!formData.urlORG || !formData.urlNNG) {
          alert("Erreur : Pour un OBL (Original), vous devez impérativement téléverser les fichiers ORG et NNG.");
          setIsSaving(false);
          return;
        }
      } else if (formData.typeConnaissement === "SWB") {
        if (!formData.urlSWB) {
          alert("Erreur : Pour un SWB (Seaway Bill), vous devez impérativement téléverser le fichier SWB.");
          setIsSaving(false);
          return;
        }
      }

      const url = isNew ? "/api/bls" : `/api/bls/${bl.id}`;
      const method = isNew ? "POST" : "PATCH";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          voyageId: voyage.id,
          autresCharges: autresCharges.filter(c => c.type && c.montant)
        }),
      });
      if (res.ok) {
        // Déclencher le PDF si date de retrait saisie
        if (formData.dateRetrait) {
          await generateReceiptPDF(formData.booking, formData.typeConnaissement);
        }
        onSave();
        onClose();
      } else {
        const errorData = await res.json();
        alert(`Erreur d'enregistrement :\n\n${errorData.error || "Impossible d'enregistrer le BL"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur réseau est survenue.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = (val: any) => `w-full px-4 py-2 rounded-xl border-2 border-slate-300 ${val ? "bg-slate-50" : "bg-white"} focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm`;
  const labelCls = "text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col border border-white/20">
        
        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-700 p-8 text-white flex justify-between items-center flex-shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black tracking-tight">{isNew ? "Ajouter un BL" : `Edition BL ${bl.booking}`}</h2>
            </div>
            <p className="text-blue-100/80 text-sm font-bold flex items-center gap-2">
              <ShipWheel className="w-4 h-4" />
              {voyage.navire?.nom || "N/A"} — Voyage {voyage.numero}
              {voyage.etd && (
                <> — ETD: {format(new Date(voyage.etd), "dd/MM/yy")}</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-95 relative z-10 border border-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-8 bg-slate-50/30">
          
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-primary rounded-full" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Informations Principal</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50">
                <div className={`col-span-2 ${isNew ? "" : "hidden"}`}>
                  <label className={labelCls}><Hash className="w-3 h-3" /> N° Booking</label>
                  <input className={`${inputCls(formData.booking)} text-lg font-mono font-black text-primary`} required={isNew} value={formData.booking} onChange={set("booking")} placeholder="Ex: 4055010790" />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Calendar className="w-3 h-3" /> Date de Retrait</label>
                  <input type="date" className={inputCls(formData.dateRetrait)} value={formData.dateRetrait} onChange={set("dateRetrait")} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>POD (Destination)</label>
                  <input className={inputCls(formData.pod)} required={isDateRetraitSaisie} value={formData.pod} onChange={set("pod")} placeholder="Ex: FRLEH" />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <label className={labelCls}>Shipper (Chargeur)</label>
                  <input className={inputCls(formData.shipper)} required={isDateRetraitSaisie} value={formData.shipper} onChange={set("shipper")} placeholder="Nom du client..." />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <label className={labelCls}>Type Connaissement</label>
                  <select className={inputCls(formData.typeConnaissement)} required={isDateRetraitSaisie} value={formData.typeConnaissement} onChange={set("typeConnaissement")}>
                    <option value="">— Type —</option>
                    <option value="OBL">OBL (Original)</option>
                    <option value="SWB">SWB (Sea Waybill)</option>
                  </select>
                </div>

                {/* Document Buttons with Upload Support */}
                <div className="col-span-2 pt-4">
                  <label className={labelCls}>Documents BL</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["ORG", "NNG", "SWB"] as const).map(type => {
                      const isActive = formData[`is${type}` as keyof typeof formData];
                      const hasUrl = formData[`url${type}` as keyof typeof formData];
                      const isDisabled = type === "SWB" ? formData.typeConnaissement !== "SWB" : formData.typeConnaissement !== "OBL";
                      const isThisUploading = isUploading && activeUploadType === type;
                      
                      return (
                        <div key={type} className="relative group">
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleToggleAndOpen(type)}
                            className={`w-full py-3 rounded-xl font-black text-[10px] transition-all border-2 flex items-center justify-between px-4 gap-2 ${
                              !isDisabled
                                ? isActive
                                  ? type === "SWB" ? "bg-emerald-600 border-emerald-600 text-white" : type === "NNG" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-800 border-slate-800 text-white"
                                  : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                : "bg-slate-50 border-slate-50 text-slate-200 cursor-not-allowed"
                            }`}
                          >
                            <span className="flex-1 text-center">{type}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${hasUrl ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>
                              {hasUrl ? "1" : "0"}
                            </span>
                          </button>
                          
                          {/* Upload/Delete Action Overlay */}
                          {!isDisabled && !isNew && (
                            <div className="absolute -top-3 -right-2 flex items-center gap-1 z-20">
                              {hasUrl && !isThisUploading && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(type); }}
                                  className="p-1 px-2 rounded-lg bg-rose-500 border-2 border-white text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all hover:scale-110 active:scale-95"
                                  title="Supprimer définitivement du Cloud"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleUploadClick(type); }}
                                className={`p-2 rounded-full shadow-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                                  isThisUploading ? "bg-orange-500 border-white animate-pulse" : hasUrl ? "bg-emerald-500 border-white text-white" : "bg-primary border-white text-white ring-2 ring-primary/20"
                                }`}
                                title={hasUrl ? "Remplacer le PDF actuel" : "Téléverser le PDF Cloud"}
                              >
                                {isThisUploading ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <CloudUpload className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2 pt-2">
                  <div className="relative group">
                      <button
                        type="button"
                        onClick={() => handleToggleAndOpen("SCANNE")}
                        className={`w-full py-3 rounded-xl font-black text-[11px] transition-all border-2 flex items-center justify-between px-6 gap-2 ${
                          formData.isScanne ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-white border-blue-100 text-blue-600"
                        }`}
                      >
                         <span className="flex-1 text-center">DOSSIER SCANNÉ</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${formData.urlScanne ? "bg-white/20 text-white" : "bg-blue-50 text-blue-300"}`}>
                            {formData.urlScanne ? "1" : "0"}
                         </span>
                      </button>

                      {/* Upload/Delete for Scanned Folder */}
                      {!isNew && (
                        <div className="absolute -top-3 -right-2 flex items-center gap-1 z-20">
                           {formData.urlScanne && !(isUploading && activeUploadType === "SCANNE") && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteFile("SCANNE"); }}
                                className="p-1 px-2 rounded-lg bg-rose-500 border-2 border-white text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all hover:scale-110 active:scale-95"
                                title="Supprimer définitivement du Cloud"
                              >
                                <Trash2 className="w-3" />
                              </button>
                           )}
                           
                           <button
                             type="button"
                             onClick={(e) => { e.stopPropagation(); handleUploadClick("SCANNE"); }}
                             className={`p-2 rounded-full shadow-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                               isUploading && activeUploadType === "SCANNE" ? "bg-orange-500 border-white animate-pulse" : formData.urlScanne ? "bg-emerald-500 border-white text-white" : "bg-primary border-white text-white ring-2 ring-primary/20"
                             }`}
                             title={formData.urlScanne ? "Remplacer le dossier" : "Téléverser le Dossier Scanné"}
                           >
                             {isUploading && activeUploadType === "SCANNE" ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <CloudUpload className="w-3 h-3" />}
                           </button>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}><MessageSquare className="w-3 h-3" /> Note Interne</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-[9px] font-black text-slate-400 group-hover:text-primary transition-colors uppercase tracking-widest">Traité</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-2 border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                      checked={formData.isNoteTraitee}
                      onChange={handleCheckboxChange("isNoteTraitee")}
                    />
                  </label>
                </div>
                <textarea className={`${inputCls(formData.commentaire)} resize-none py-3 min-h-[100px] shadow-sm`} placeholder="Ajouter une instruction..." value={formData.commentaire} onChange={set("commentaire")} />
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-orange-500 rounded-full" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Finance & Suivi</h3>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50 space-y-4">
                <div className="space-y-1.5">
                  <label className={labelCls}><FileText className="w-3 h-3" /> Statut Fret</label>
                  <select className={inputCls(formData.statutFret)} required={isDateRetraitSaisie} value={formData.statutFret} onChange={set("statutFret")}>
                    {STATUT_FRET_OPTIONS.map(o => <option key={o} value={o}>{o || "— Sélectionner —"}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Hash className="w-3 h-3" /> N° Timbre</label>
                  <input className={inputCls(formData.numTimbre)} required={isDateRetraitSaisie} placeholder="T-XXXXXX" value={formData.numTimbre} onChange={set("numTimbre")} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Tag className="w-3 h-3" /> Correction BL</label>
                  <select className={inputCls(formData.statutCorrection)} required={isDateRetraitSaisie} value={formData.statutCorrection} onChange={set("statutCorrection")}>
                    {STATUT_CORRECTION_OPTIONS.map(o => <option key={o} value={o}>{o || "— Sélectionner —"}</option>)}
                  </select>
                </div>
              </div>

              {/* Autres Charges */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <label className={labelCls}>Charges Additionnelles</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowTypeManager(!showTypeManager)} className={`text-[9px] font-black p-1 px-2 rounded-lg border transition-all uppercase ${showTypeManager ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-primary hover:border-primary"}`}>
                      {showTypeManager ? "ANNULER" : "(+) TYPE"}
                    </button>
                    <button type="button" onClick={addCharge} className="text-[10px] font-black text-primary flex items-center gap-1 bg-primary/5 p-1 px-2 rounded-lg border border-primary/10 hover:bg-primary hover:text-white transition-all"><Plus className="w-3 h-3" /> AJOUTER</button>
                  </div>
                </div>

                {showTypeManager && (
                  <div className="mb-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Nouveau Type de Charge</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTypeName} 
                        onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
                        placeholder="Ex: FRAIS DE DOSSIER"
                        className="flex-1 bg-white border border-blue-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button 
                        type="button" 
                        disabled={isCreatingType || !newTypeName.trim()}
                        onClick={handleCreateTypeCharge}
                        className="bg-primary text-white p-2 rounded-lg disabled:opacity-50 transition-all hover:scale-105"
                      >
                        {isCreatingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {autresCharges.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <select className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 flex-1" value={c.type} onChange={(e) => updateCharge(i, "type", e.target.value)}>
                        <option value="">Type...</option>
                        {typeCharges.map(tc => <option key={tc.id} value={tc.nom}>{tc.nom}</option>)}
                      </select>
                      <input 
                        className="w-32 bg-white/50 px-2 py-1 rounded-lg border-2 border-slate-300 text-[11px] font-mono font-black text-blue-600 text-right focus:ring-1 focus:ring-blue-200 transition-all shadow-sm" 
                        value={formatAmount(c.montant)} 
                        onChange={(e) => updateCharge(i, "montant", e.target.value)} 
                      />
                      <button onClick={() => removeCharge(i)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retour */}
              <div className={`p-6 rounded-[2rem] border transition-all ${formData.raisonRetour ? "bg-orange-50 border-orange-200" : "bg-white border-slate-100"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className={`w-4 h-4 ${formData.raisonRetour ? "text-orange-500" : "text-slate-300"}`} />
                    <span className="text-[10px] font-black text-slate-800 uppercase uppercase">Retour Dossier</span>
                  </div>
                  {!showReturnForm && (
                     <button type="button" onClick={() => setShowReturnForm(true)} className="text-[9px] font-black p-1 px-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white uppercase">{formData.raisonRetour ? "Modifier" : "Signaler"}</button>
                  )}
                </div>
                {showReturnForm && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <select className={inputCls(formData.raisonRetour)} value={formData.raisonRetour} onChange={set("raisonRetour")}>
                      <option value="">Raison...</option>
                      {raisonRetourOptions.map(o => <option key={o.id} value={o.nom}>{o.nom}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" className={inputCls(formData.dateRetour)} value={formData.dateRetour} onChange={set("dateRetour")} />
                      <button type="button" onClick={() => setShowReturnForm(false)} className="bg-slate-800 text-white text-[10px] font-black rounded-xl">OK</button>
                    </div>
                  </div>
                )}
                {formData.raisonRetour && !showReturnForm && <div className="text-[11px] font-bold text-orange-700 bg-white/50 p-2 rounded-lg">{formData.raisonRetour}</div>}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-100 flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-[1.5rem] border-2 border-slate-100 font-black text-slate-400 text-xs uppercase">Fermer</button>
            
            {bl && (
              <button 
                type="button" 
                onClick={async () => {
                  if (window.confirm(`Voulez-vous vraiment supprimer le BL ${bl.booking} ?`)) {
                    setIsSaving(true);
                    try {
                      const res = await fetch(`/api/bls/${bl.id}`, { method: "DELETE" });
                      if (res.ok) {
                        onSave();
                        onClose();
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsSaving(false);
                    }
                  }
                }}
                disabled={isSaving || isUploading}
                className="px-6 py-4 rounded-[1.5rem] bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-2 border-red-100 transition-all active:scale-95 disabled:opacity-50"
                title="Supprimer ce BL"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button type="submit" disabled={isSaving || isUploading} className="flex-[2] px-6 py-4 rounded-[1.5rem] bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Enregistrer les modifications</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
