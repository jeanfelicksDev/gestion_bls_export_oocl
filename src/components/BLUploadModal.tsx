"use client";

import React, { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { fetchSync } from "@/lib/fetchSync";

interface BLUploadModalProps {
  voyageId: string;
  voyageLabel: string; // e.g. "ONE PRESENCE — 014E"
  onClose: () => void;
  onSuccess: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

export default function BLUploadModal({ voyageId, voyageLabel, onClose, onSuccess }: BLUploadModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setStatus("error");
      setMessage("Format invalide. Veuillez utiliser un fichier .xlsx ou .xls");
      return;
    }

    setStatus("loading");
    setMessage("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const blsRows = data.slice(2);
        const bls = blsRows
          .filter(row => row[0] && String(row[0]).trim() !== "" && String(row[0]).toLowerCase().trim() !== "booking")
          .map(row => ({
            booking: row[0],
            pod: row[1],
            shipper: row[2],
            statut: row[3],
            typeConnaissement: row[4],
            tender: row[5],
            freighting: row[6],
            valeurFret: row[7],
          }));

        if (bls.length === 0) {
          setStatus("error");
          setMessage("Aucun BL trouvé dans ce fichier.");
          return;
        }

        const res = await fetchSync(`/api/voyages/${voyageId}/bls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bls }),
        });

        if (res.ok) {
          setCount(bls.length);
          setStatus("success");
          onSuccess();
        } else {
          const err = await res.json();
          setStatus("error");
          setMessage(err.error || "Erreur lors du chargement");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage("Erreur de lecture : " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-brand-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-primary p-4 md:p-6 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6" />
              <h2 className="text-xl font-bold">Charger les BLs</h2>
            </div>
            <p className="text-blue-200 text-sm mt-1 ml-9">{voyageLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-card/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 md:p-8 space-y-6">
          {/* Drop zone */}
          {status !== "success" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => status !== "loading" && inputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                ${isDragging ? "border-primary bg-brand-surface scale-[1.02]" : "border-brand-border-highlight bg-brand-bg hover:border-primary hover:bg-brand-surface/30"}
                ${status === "loading" ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={status === "loading"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />

              {status === "loading" ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
                  <p className="text-primary font-semibold">Traitement en cours...</p>
                </>
              ) : (
                <>
                  <div className={`p-4 rounded-2xl mb-4 transition-all ${isDragging ? "bg-primary text-white scale-110" : "bg-brand-card text-gray-400 shadow-sm"}`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="text-brand-text font-semibold text-center">
                    {isDragging ? "Déposez le fichier ici" : "Cliquez ou glissez-déposez"}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">Fichier Excel (.xlsx, .xls)</p>
                </>
              )}
            </div>
          )}

          {/* Success state */}
          {status === "success" && (
            <div className="flex flex-col items-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="bg-green-100 p-5 rounded-full mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-brand-text">Chargement réussi !</h3>
              <p className="text-brand-text-muted mt-2">
                <span className="font-black text-green-600 text-2xl">{count}</span> BL{count > 1 ? "s" : ""} chargé{count > 1 ? "s" : ""} avec succès.
              </p>
            </div>
          )}

          {/* Error message */}
          {status === "error" && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-brand-border-highlight font-bold text-brand-text-muted hover:bg-brand-bg transition-all"
            >
              {status === "success" ? "Fermer" : "Annuler"}
            </button>
            {status === "success" && (
              <button
                onClick={() => { setStatus("idle"); setCount(0); }}
                className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Charger un autre
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
