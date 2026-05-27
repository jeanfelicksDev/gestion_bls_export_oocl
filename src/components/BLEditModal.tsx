"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, Save, Calendar, Tag, FileText, Hash, MessageSquare, 
  Plus, Trash2, CheckCircle2, RotateCcw, AlertCircle, 
  ShipWheel, Eye, CloudUpload, Loader2, DollarSign, Receipt
} from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import { formatAmount, unformatAmount } from "@/lib/utils";
import { fetchSync } from "@/lib/fetchSync";

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

type ModalTab = "general" | "finance" | "documents" | "retour";

const STATUT_FRET_OPTIONS = ["", "Fret_ABJ", "Fret_OK", "Unrated", "A_Revoir"];
const STATUT_CORRECTION_OPTIONS = ["", "OK_Print", "Attente_Correction", "Attente_OK"];

export default function BLEditModal({ bl, voyage, onClose, onSave }: BLEditModalProps) {
  const isNew = !bl?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<"ORG" | "NNG" | "SWB" | "SCANNE" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("general");
  
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
      const res = await fetchSync("/api/type-charges");
      if (res.ok) setTypeCharges(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchRaisonRetourOptions = async () => {
    try {
      const res = await fetchSync("/api/raison-retour");
      if (res.ok) setRaisonRetourOptions(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleCreateTypeCharge = async () => {
    if (!newTypeName.trim()) return;
    setIsCreatingType(true);
    try {
      const res = await fetchSync("/api/type-charges", {
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
    const field = type === "SCANNE" ? "isScanne" : `is${type}` as keyof typeof formData;
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));

    const storedUrl = formData[type === "SCANNE" ? "urlScanne" : `url${type}` as keyof typeof formData];
    if (storedUrl) {
      window.open(storedUrl, '_blank', 'noopener,noreferrer');
    } else if (formData.booking) {
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
      const res = await fetchSync(`/api/bls/upload?filename=${encodeURIComponent(filename)}&blId=${bl.id}&type=${activeUploadType}`, {
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
      const res = await fetchSync(`/api/bls/upload?blId=${bl.id}&type=${type}&url=${encodeURIComponent(url as string)}`, {
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
      let y = 90;

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
        details = `Le connaissement ${booking} (${typeConnaissement || "type non défini"})`;
      }

      doc.text(text1, margin, y);
      y += 10;
      doc.text(text2, margin, y);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text(details, margin, y);
      
      y += 40;
      doc.setFont("helvetica", "bold");
      doc.text("Signature + cachet + mention « lu et approuvé »", pageWidth - margin - 85, y);
      
      y += 30;
      doc.setFont("helvetica", "normal");
      const today = format(new Date(), "dd/MM/yyyy");
      doc.text(`Abidjan, le ${today}`, pageWidth - margin - 45, y);

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
        
        dRetrait.setHours(0, 0, 0, 0);
        dEtd.setHours(0, 0, 0, 0);

        if (dRetrait < dEtd) {
          alert(`Erreur : La date de retrait (${format(dRetrait, "dd/MM/yyyy")}) ne peut pas être antérieure à la date de départ prévue (${format(dEtd, "dd/MM/yyyy")}).`);
          setIsSaving(false);
          return;
        }
      }

      // Validation : Documents obligatoires si ETD >= 01/04/2026
      const etdString = voyage.etd ? voyage.etd.substring(0, 10) : ""; 
      const threshold = "2026-04-01";

      if (formData.dateRetrait && etdString && etdString >= threshold) {
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
      }

      const url = isNew ? "/api/bls" : `/api/bls/${bl.id}`;
      const method = isNew ? "POST" : "PATCH";
      
      const res = await fetchSync(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          voyageId: voyage.id,
          autresCharges: autresCharges.filter(c => c.type && c.montant)
        }),
      });
      if (res.ok) {
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

  const inputCls = "w-full px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-semibold text-brand-text placeholder:text-brand-text-muted shadow-sm";
  const labelCls = "text-[9px] font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-1.5 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-brand-card rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col border border-brand-border">
        
        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />

        {/* --- Header banner --- */}
        <div className="bg-gradient-to-r from-primary to-secondary p-5 md:p-6 text-white flex justify-between items-center flex-shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-xl font-black tracking-tight">{isNew ? "Ajouter un BL" : `Edition BL OOLU${bl.booking}`}</h2>
            <p className="text-white/80 text-xs font-bold flex items-center gap-1.5 mt-1">
              <ShipWheel className="w-4 h-4 animate-spin-ring" />
              {voyage.navire?.nom || "N/A"} — Voyage {voyage.numero}
              {voyage.etd && (
                <> — ETD : {format(new Date(voyage.etd), "dd/MM/yy")}</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95 relative z-10 border border-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Modal Navigation Tabs --- */}
        <div className="flex bg-brand-surface/40 border-b border-brand-border px-6 py-3 gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              activeTab === "general"
                ? "bg-primary text-white border-primary glow-primary"
                : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
            }`}
          >
            📄 Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              activeTab === "finance"
                ? "bg-primary text-white border-primary glow-primary"
                : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
            }`}
          >
            💰 Finance & Charges
          </button>
          <button
            type="button"
            disabled={isNew}
            onClick={() => setActiveTab("documents")}
            className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === "documents"
                ? "bg-primary text-white border-primary glow-primary"
                : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
            }`}
          >
            📂 PDF & Documents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("retour")}
            className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              activeTab === "retour"
                ? "bg-primary text-white border-primary glow-primary"
                : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
            }`}
          >
            🔄 Notes & Retour
          </button>
        </div>

        {/* --- Scrollable Form Body --- */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 md:p-8 space-y-6 bg-brand-bg/20">
          
          {/* TAB 1: General Info */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-primary rounded-full" />
                <h3 className="text-xs font-black text-brand-text uppercase tracking-widest">Informations Générales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm">
                <div className={`md:col-span-2 ${isNew ? "" : "hidden"}`}>
                  <label className={labelCls}><Hash className="w-3.5 h-3.5" /> N° Booking</label>
                  <input 
                    className={`${inputCls} text-base font-mono font-black text-primary`} 
                    required={isNew} 
                    value={formData.booking} 
                    onChange={set("booking")} 
                    placeholder="Ex: 4055010790" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Calendar className="w-3.5 h-3.5" /> Date de Retrait</label>
                  <input type="date" className={inputCls} value={formData.dateRetrait} onChange={set("dateRetrait")} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Destination POD</label>
                  <input className={inputCls} required={isDateRetraitSaisie} value={formData.pod} onChange={set("pod")} placeholder="Ex: FRLEH" />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Shipper (Chargeur)</label>
                  <input className={inputCls} required={isDateRetraitSaisie} value={formData.shipper} onChange={set("shipper")} placeholder="Nom complet..." />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Type de Connaissement</label>
                  <select className={inputCls} required={isDateRetraitSaisie} value={formData.typeConnaissement} onChange={set("typeConnaissement")}>
                    <option value="">— Sélectionner —</option>
                    <option value="OBL">OBL (Original)</option>
                    <option value="SWB">SWB (Sea Waybill)</option>
                    <option value="Telex">Télex</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Finance & Extra charges */}
          {activeTab === "finance" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-amber-500 rounded-full" />
                <h3 className="text-xs font-black text-brand-text uppercase tracking-widest">Finance & Suivi Fret</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm">
                <div className="space-y-1.5">
                  <label className={labelCls}><FileText className="w-3.5 h-3.5" /> Statut Fret</label>
                  <select className={inputCls} required={isDateRetraitSaisie} value={formData.statutFret} onChange={set("statutFret")}>
                    {STATUT_FRET_OPTIONS.map(o => <option key={o} value={o}>{o || "— Aucun —"}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Hash className="w-3.5 h-3.5" /> N° Timbre</label>
                  <input className={inputCls} required={isDateRetraitSaisie} placeholder="T-XXXXXX" value={formData.numTimbre} onChange={set("numTimbre")} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Tag className="w-3.5 h-3.5" /> Correction BL</label>
                  <select className={inputCls} required={isDateRetraitSaisie} value={formData.statutCorrection} onChange={set("statutCorrection")}>
                    {STATUT_CORRECTION_OPTIONS.map(o => <option key={o} value={o}>{o || "— Aucun —"}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><DollarSign className="w-3.5 h-3.5" /> Devise & Montant</label>
                  <div className="flex gap-2">
                    <select className="w-24 px-3 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card text-sm font-semibold text-brand-text focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none" value={formData.deviseFret} onChange={set("deviseFret")}>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="XOF">XOF (FCFA)</option>
                    </select>
                    <input className="flex-1 px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-mono font-black text-brand-text placeholder:text-brand-text-muted shadow-sm text-right" placeholder="Montant..." value={formatAmount(formData.montantFret)} onChange={set("montantFret")} />
                  </div>
                </div>
              </div>

              {/* Extra Charges component */}
              <div className="bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Charges Additionnelles</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowTypeManager(!showTypeManager)} className={`text-[9px] font-black p-1.5 px-3 rounded-lg border transition-all uppercase ${showTypeManager ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-brand-surface border-brand-border text-brand-text-muted hover:text-primary hover:border-primary"}`}>
                      {showTypeManager ? "Annuler" : "(+) Type"}
                    </button>
                    <button type="button" onClick={addCharge} className="text-[9px] font-black text-primary flex items-center gap-1 bg-primary/5 p-1.5 px-3 rounded-lg border border-primary/10 hover:bg-primary hover:text-white transition-all"><Plus className="w-3.5 h-3.5" /> Ajouter</button>
                  </div>
                </div>

                {showTypeManager && (
                  <div className="mb-4 p-4.5 bg-brand-surface/40 border border-brand-border rounded-xl space-y-2.5 animate-in slide-in-from-top-2">
                    <p className="text-[9px] font-black text-primary uppercase tracking-wider">Nouveau Type de Charge</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTypeName} 
                        onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
                        placeholder="Ex : FRAIS DE DOSSIER"
                        className="flex-1 bg-brand-card border-2 border-brand-border-highlight rounded-xl px-3.5 py-2 text-xs font-bold text-brand-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                      <button 
                        type="button" 
                        disabled={isCreatingType || !newTypeName.trim()}
                        onClick={handleCreateTypeCharge}
                        className="bg-primary text-white px-3.5 rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                      >
                        {isCreatingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {autresCharges.length === 0 ? (
                    <p className="text-xs text-brand-text-muted italic py-3">Aucune charge supplémentaire enregistrée.</p>
                  ) : (
                    autresCharges.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 bg-brand-surface/50 rounded-xl border border-brand-border animate-in slide-in-from-bottom-2">
                        <select className="bg-transparent border-none p-0 text-xs font-bold text-brand-text flex-1 focus:ring-0" value={c.type} onChange={(e) => updateCharge(i, "type", e.target.value)}>
                          <option value="">Sélectionner un type...</option>
                          {typeCharges.map(tc => <option key={tc.id} value={tc.nom}>{tc.nom}</option>)}
                        </select>
                        <input 
                          className="w-32 bg-brand-card/70 px-2 py-1 rounded-lg border-2 border-brand-border-highlight text-xs font-mono font-black text-brand-text text-right focus:border-primary transition-all" 
                          value={formatAmount(c.montant)} 
                          onChange={(e) => updateCharge(i, "montant", e.target.value)} 
                        />
                        <button onClick={() => removeCharge(i)} className="text-brand-text-muted hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: File uploads */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-indigo-500 rounded-full" />
                <h3 className="text-xs font-black text-brand-text uppercase tracking-widest">Fichiers & Originaux Cloud</h3>
              </div>

              <div className="bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm space-y-5">
                <p className="text-xs text-brand-text-muted font-medium leading-relaxed">
                  Gérez les exemplaires originaux fusionnés sous forme de documents PDF archivés sur le Cloud DSM. 
                  Téléversez un fichier pour valider la conformité du retrait.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(["ORG", "NNG", "SWB"] as const).map(type => {
                    const isActive = formData[`is${type}` as keyof typeof formData];
                    const hasUrl = formData[`url${type}` as keyof typeof formData];
                    const isDisabled = type === "SWB" ? formData.typeConnaissement !== "SWB" : formData.typeConnaissement !== "OBL";
                    const isThisUploading = isUploading && activeUploadType === type;
                    
                    return (
                      <div key={type} className="relative group p-4 bg-brand-surface/35 border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-between h-36">
                        <div className="text-center">
                          <p className="text-xs font-black text-brand-text uppercase tracking-wider">{type}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black mt-1 ${
                            hasUrl ? "bg-emerald-500/10 text-emerald-500" : "bg-brand-border-highlight text-brand-text-muted"
                          }`}>
                            {hasUrl ? "TÉLÉVERSÉ" : "ABSENT"}
                          </span>
                        </div>

                        <div className="flex gap-2 w-full mt-3">
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleToggleAndOpen(type)}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                              !isDisabled
                                ? hasUrl 
                                  ? "bg-indigo-600 border-indigo-600 text-white" 
                                  : "bg-brand-card border-brand-border text-brand-text hover:bg-brand-surface"
                                : "bg-brand-surface/50 border-transparent text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            Ouvrir
                          </button>
                          
                          {!isDisabled && (
                            <button
                              type="button"
                              onClick={() => handleUploadClick(type)}
                              className="p-1.5 bg-primary text-white border border-primary rounded-lg transition-all hover:scale-105 active:scale-95"
                              title="Téléverser PDF"
                            >
                              {isThisUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {hasUrl && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(type)}
                              className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scanned Folder Section */}
                <div className="pt-4 border-t border-brand-border">
                  <label className={labelCls}>Dossier complet scanné</label>
                  <div className="flex items-center justify-between p-4 bg-brand-surface/40 border border-brand-border rounded-2xl flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${formData.urlScanne ? "bg-blue-500/10 text-blue-500" : "bg-brand-border-highlight text-brand-text-muted"}`}>
                        <CloudUpload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-brand-text uppercase tracking-wider">DOSSIER SCANNÉ COMPLET</p>
                        <p className="text-[10px] text-brand-text-muted font-semibold mt-0.5">
                          {formData.urlScanne ? "Archive PDF scannée présente sur le serveur" : "Aucune copie scannée de l'acte de retrait"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAndOpen("SCANNE")}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                          formData.urlScanne ? "bg-blue-500 border-blue-500 text-white" : "bg-brand-card border-brand-border text-brand-text hover:bg-brand-surface"
                        }`}
                      >
                        Visualiser
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUploadClick("SCANNE")}
                        className="p-2 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all"
                        title="Importer"
                      >
                        {isUploading && activeUploadType === "SCANNE" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                      </button>
                      {formData.urlScanne && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFile("SCANNE")}
                          className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Returns & Internal Notes */}
          {activeTab === "retour" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-indigo-600 rounded-full" />
                <h3 className="text-xs font-black text-brand-text uppercase tracking-widest">Notes Internes & Retours de BL</h3>
              </div>

              {/* Internal notes */}
              <div className="bg-brand-card p-5 md:p-6 rounded-2xl border border-brand-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className={labelCls}><MessageSquare className="w-3.5 h-3.5" /> Note d'Instruction Interne</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-[9px] font-black text-brand-text-muted group-hover:text-primary transition-colors uppercase tracking-widest">Note Traitée</span>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-2 border-brand-border-highlight text-primary focus:ring-primary/20 transition-all cursor-pointer bg-brand-card"
                      checked={formData.isNoteTraitee}
                      onChange={handleCheckboxChange("isNoteTraitee")}
                    />
                  </label>
                </div>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border-2 border-brand-border-highlight bg-brand-card focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-semibold text-brand-text placeholder:text-brand-text-muted shadow-sm min-h-[100px] resize-none" 
                  placeholder="Inscrivez une consigne ou remarque interne ici..." 
                  value={formData.commentaire} 
                  onChange={set("commentaire")} 
                />
              </div>

              {/* Returns form */}
              <div className={`p-5 md:p-6 rounded-2xl border transition-all shadow-sm ${
                formData.raisonRetour ? "bg-red-500/5 border-red-500/20" : "bg-brand-card border-brand-border"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <RotateCcw className={`w-4 h-4 ${formData.raisonRetour ? "text-red-500" : "text-brand-text-muted"}`} />
                    <span className="text-[10px] font-black text-brand-text uppercase">Retour du connaissement physique</span>
                  </div>
                  {!showReturnForm && (
                     <button type="button" onClick={() => setShowReturnForm(true)} className="text-[9px] font-black p-1.5 px-3 rounded-lg bg-brand-surface text-brand-text-dim hover:bg-primary hover:text-white border border-brand-border transition-colors uppercase">
                       {formData.raisonRetour ? "Modifier" : "Déclarer Retour"}
                     </button>
                  )}
                </div>
                
                {showReturnForm && (
                  <div className="space-y-3.5 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Motif du Retour</label>
                      <select className={inputCls} value={formData.raisonRetour} onChange={set("raisonRetour")}>
                        <option value="">Sélectionner une raison...</option>
                        {raisonRetourOptions.map(o => <option key={o.id} value={o.nom}>{o.nom}</option>)}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelCls}>Date du Retour</label>
                        <input type="date" className={inputCls} value={formData.dateRetour} onChange={set("dateRetour")} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Facture Associée</label>
                        <input className={inputCls} placeholder="N° Facture..." value={formData.numFactureRetour} onChange={set("numFactureRetour")} />
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={() => setShowReturnForm(false)} className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all active:scale-95 uppercase tracking-wider">Valider</button>
                    </div>
                  </div>
                )}
                
                {formData.raisonRetour && !showReturnForm && (
                  <div className="text-xs font-bold text-red-500 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                    <span className="font-black text-[9px] uppercase tracking-wider block mb-1">Motif de retour actif :</span>
                    {formData.raisonRetour}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- Modal Footer Actions --- */}
          <div className="flex gap-3 pt-5 border-t border-brand-border flex-shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-5 py-3.5 rounded-xl border border-brand-border font-black text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-all text-xs uppercase tracking-wider"
            >
              Fermer
            </button>
            
            {!isNew && (
              <button 
                type="button" 
                onClick={async () => {
                  if (window.confirm(`Voulez-vous vraiment supprimer définitivement le BL ${bl.booking} ?`)) {
                    setIsSaving(true);
                    try {
                      const res = await fetchSync(`/api/bls/${bl.id}`, { method: "DELETE" });
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
                className="px-4 py-3.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                title="Supprimer ce connaissement"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button 
              type="submit" 
              disabled={isSaving || isUploading} 
              className="flex-[2] px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/10"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
