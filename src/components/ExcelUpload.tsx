"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileUp, Check, AlertCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExcelUploadProps {
  onUploadSuccess: () => void;
}

export default function ExcelUpload({ onUploadSuccess }: ExcelUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert sheet to JSON array of arrays to handle the header structure
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (data.length < 4) throw new Error("Format de fichier invalide");

        // row 0: NAVIRE: ONE PRESENCE   VOYAGE: 024E   ETA : 12/03/2026   ETD : 13/03/2026
        const headerRow = data[0];
        const headerText = headerRow.join(" ");
        
        const navire = headerText.match(/NAVIRE[:\s]+(.*?)(?=\s+VOYAGE|$)/i)?.[1]?.trim() || "";
        const voyage = headerText.match(/VOYAGE[:\s]+(.*?)(?=\s+ETA|$)/i)?.[1]?.trim() || "";
        const etaText = headerText.match(/ETA[:\s]+(.*?)(?=\s+ETD|$)/i)?.[1]?.trim() || "";
        const etdText = headerText.match(/ETD[:\s]+(.*?)(?=$)/i)?.[1]?.trim() || "";

        // Function to parse date from string (likely DD/MM/YYYY)
        const parseDate = (d: string) => {
          if (!d) return null;
          const parts = d.split("/");
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
          }
          return null;
        };

        const header = {
          navire,
          voyage,
          eta: parseDate(etaText),
          etd: parseDate(etdText),
        };

        // row 2 is usually headers: Booking, POD, Shipper, STATUT, TYPECONNAISSEMENT, TENDER, FREIGHTING, VALEUR FRET
        // data rows start from index 3
        const blsRows = data.slice(2); // Start from index 2 to be safe and filter
        const bls = blsRows.filter(row => 
          row[0] && 
          String(row[0]).trim() !== "" && 
          String(row[0]).toLowerCase().trim() !== "booking"
        ).map(row => ({
          booking: row[0],
          pod: row[1],
          shipper: row[2],
          statut: row[3],
          typeConnaissement: row[4],
          tender: row[5],
          freighting: row[6],
          valeurFret: row[7],
        }));

        const response = await fetch("/api/voyages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ header, bls }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'enregistrement");
        }

        onUploadSuccess();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="w-full">
      <label className={cn(
        "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
        "bg-white/50 border-gray-300 hover:border-primary hover:bg-white/80",
        isUploading && "opacity-50 cursor-not-allowed"
      )}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-gray-500" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Cliquez pour importer</span> ou glissez-déposez
          </p>
          <p className="text-xs text-gray-400">Excel (.xlsx, .xls)</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>
      
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
