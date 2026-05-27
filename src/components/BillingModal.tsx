"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, FileDown, Eye, EyeOff, DollarSign, Ship, Calendar, Loader2, AlertCircle, Save, CheckCircle2, Receipt } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatAmount, unformatAmount } from "@/lib/utils";
import { fetchSync } from "@/lib/fetchSync";

interface BillingModalProps {
  voyage: any;
  onClose: () => void;
}

// OOCL branding colors
const OOCL_BLUE = [0, 47, 108] as [number, number, number];      // #002F6C
const OOCL_RED  = [200, 16, 46] as [number, number, number];      // #C8102E
const LIGHT_BLUE = [235, 241, 251] as [number, number, number];   // Table headers
const CHARGES_BLUE = [218, 230, 248] as [number, number, number]; // Secondary charges header
const ROW_ALT = [249, 250, 252] as [number, number, number];      // Alternate rows

export default function BillingModal({ voyage, onClose }: BillingModalProps) {
  const [tauxDollar, setTauxDollar] = useState(voyage.tauxDollar || "600 XOF");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showError, setShowError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Auto-Save Taux Dollar
  useEffect(() => {
    if (tauxDollar === voyage.tauxDollar) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetchSync(`/api/voyages/${voyage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tauxDollar }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          voyage.tauxDollar = tauxDollar;
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("Save error:", err);
        setSaveStatus("error");
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [tauxDollar, voyage.id, voyage.tauxDollar]);

  const hasUSD = useMemo(() => {
    return voyage.bls.some((bl: any) => {
      const isUSD = bl.deviseFret?.toString().toUpperCase() === "USD";
      const hasAmount = parseFloat(bl.montantFret || "0") > 0;
      return isUSD && hasAmount;
    });
  }, [voyage.bls]);

  const otherChargeTypes = useMemo(() => {
    const types = new Set<string>();
    voyage.bls.forEach((bl: any) => {
      bl.autresCharges?.forEach((c: any) => {
        if (c.type) types.add(c.type);
      });
    });
    return Array.from(types);
  }, [voyage.bls]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { "Taxe de Port": true };
    otherChargeTypes.forEach(t => { initial[t] = true; });
    return initial;
  });

  const toggleColumn = (col: string) =>
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));

  const activeColumns = ["Taxe de Port", ...otherChargeTypes].filter(c => visibleColumns[c]);

  const handleGeneratePDF = async () => {
    const rawVal = tauxDollar.replace(/[^0-9.]/g, "");
    if (hasUSD && (!rawVal || parseFloat(rawVal) <= 0)) {
      setShowError(true);
      return;
    }
    setIsGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 12;
      let y = margin;

      // Header block banner (full width)
      doc.setFillColor(...OOCL_BLUE);
      doc.rect(0, 0, pageWidth, 22, "F");

      // Red highlight accent line
      doc.setFillColor(...OOCL_RED);
      doc.rect(0, 22, pageWidth, 1.5, "F");

      // PDF Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("TABLEAU DE FACTURATION", pageWidth / 2, 15, { align: "center" });

      // Sub-heading
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 240);
      doc.text(`${voyage.navire?.nom || ""} · ${voyage.numero || ""}`, pageWidth - margin, 19, { align: "right" });

      y = 30;

      // Metadata Info (3 Columns)
      doc.setTextColor(0, 0, 0);
      const labelGray: [number, number, number] = [100, 100, 100];
      const col1x = margin;
      const col2x = margin + 80;
      const col3x = margin + 165;

      // Col 1: Ship
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelGray);
      doc.text("NAVIRE", col1x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(voyage.navire?.nom || "-", col1x, y + 8);

      // Col 2: Voyage + ETD
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelGray);
      doc.text("VOYAGE", col2x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(voyage.numero || "-", col2x, y + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelGray);
      doc.text("ETD", col2x + 40, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(voyage.etd ? format(new Date(voyage.etd), "dd/MM/yyyy") : "-", col2x + 40, y + 8);

      // Col 3: Dollar Rate (accent)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelGray);
      doc.text("TAUX DU DOLLAR", col3x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(...OOCL_RED);
      doc.text(formatAmount(tauxDollar), col3x, y + 9);

      y += 22;
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Column widths calculations
      const availWidth = pageWidth - margin * 2;
      const minBookingWidth = 34;
      const minShipperWidth = 58;
      const minChargeWidth = 22;

      doc.setFont("courier", "bold");
      doc.setFontSize(13);
      const maxBookingContentWidth = Math.max(
        doc.getTextWidth("N°BLS"),
        ...voyage.bls.map((bl: any) => doc.getTextWidth("OOLU" + (bl.booking || "")))
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const maxShipperContentWidth = Math.max(
        doc.getTextWidth("SHIPPER"),
        ...voyage.bls.map((bl: any) => doc.getTextWidth(bl.shipper || ""))
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const chargeContentWidths = activeColumns.map(col => {
        const headerWidth = doc.getTextWidth(col.toUpperCase());
        if (col === "Taxe de Port") {
          doc.setFontSize(13);
          const contentWidth = doc.getTextWidth("X");
          return Math.max(headerWidth, contentWidth);
        } else {
          doc.setFontSize(13);
          const maxAmountWidth = Math.max(
            ...voyage.bls.map((bl: any) => {
              const charge = bl.autresCharges?.find((c: any) => c.type === col);
              return doc.getTextWidth(charge?.montant?.toString() || "");
            })
          );
          return Math.max(headerWidth, maxAmountWidth);
        }
      });

      const PADDING = 6;
      const bookingWidth = Math.max(minBookingWidth, maxBookingContentWidth + PADDING);
      const shipperWidth = Math.max(minShipperWidth, maxShipperContentWidth + PADDING);
      const chargeWidths = chargeContentWidths.map(w => Math.max(minChargeWidth, w + PADDING));

      const totalCalculatedWidth = bookingWidth + shipperWidth + chargeWidths.reduce((sum, w) => sum + w, 0);

      let finalBookingWidth = bookingWidth;
      let finalShipperWidth = shipperWidth;
      let finalChargeWidths = [...chargeWidths];

      if (totalCalculatedWidth < availWidth) {
        const remainingSpace = availWidth - totalCalculatedWidth;
        finalShipperWidth += remainingSpace;
      } else if (totalCalculatedWidth > availWidth) {
        const scaleFactor = availWidth / totalCalculatedWidth;
        finalBookingWidth *= scaleFactor;
        finalShipperWidth *= scaleFactor;
        finalChargeWidths = finalChargeWidths.map(w => w * scaleFactor);
      }

      const columnStyles: Record<number, object> = {
        0: { cellWidth: finalBookingWidth, fontStyle: "bold", font: "courier", fontSize: 13, halign: "left" },
        1: { cellWidth: finalShipperWidth, fontSize: 12, halign: "left" },
      };
      activeColumns.forEach((_, i) => {
        columnStyles[i + 2] = {
          cellWidth: finalChargeWidths[i],
          halign: "center",
          fontStyle: "bold",
          fontSize: 10,
        };
      });

      const body: any[][] = voyage.bls.map((bl: any) => {
        const row: any[] = ["OOLU" + (bl.booking || ""), bl.shipper || "-"];
        activeColumns.forEach(col => {
          if (col === "Taxe de Port") {
            row.push("X");
          } else {
            const charge = bl.autresCharges?.find((c: any) => c.type === col);
            row.push(formatAmount(charge?.montant) || "");
          }
        });
        return row;
      });

      autoTable(doc, {
        startY: y,
        head: [
          [
            { content: "N°BLS", rowSpan: 2, styles: { valign: "middle", halign: "left", fontStyle: "bold", fontSize: 12 } },
            { content: "SHIPPER", rowSpan: 2, styles: { valign: "middle", halign: "left", fontStyle: "bold", fontSize: 12 } },
            ...(activeColumns.length > 0
              ? [{
                  content: "CHARGES",
                  colSpan: activeColumns.length,
                  styles: {
                    halign: "center" as const,
                    fontStyle: "bold" as const,
                    fontSize: 12,
                    fillColor: CHARGES_BLUE,
                    textColor: OOCL_BLUE,
                  },
                }]
              : []),
          ],
          activeColumns.map(col => ({
            content: col.toUpperCase(),
            styles: {
              halign: "center" as const,
              fontSize: 10,
              fontStyle: "bold" as const,
              fillColor: CHARGES_BLUE,
              textColor: [40, 60, 120] as [number, number, number],
              cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
            },
          })),
        ],
        body,
        columnStyles,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
          lineWidth: 0.25,
          lineColor: [210, 218, 230] as [number, number, number],
          textColor: [30, 30, 40] as [number, number, number],
          font: "helvetica",
          overflow: "linebreak",
          minCellHeight: 6,
        },
        headStyles: {
          fillColor: LIGHT_BLUE,
          textColor: OOCL_BLUE,
          fontStyle: "bold",
          lineWidth: 0.3,
          lineColor: [180, 200, 230] as [number, number, number],
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.row.index % 2 === 0) {
            data.cell.styles.fillColor = [255, 255, 255];
          } else if (data.section === "body") {
            data.cell.styles.fillColor = ROW_ALT;
          }
        },
        tableLineWidth: 0.5,
        tableLineColor: [160, 180, 210] as [number, number, number],
      });

      const finalY = (doc as any).lastAutoTable.finalY + 9;
      doc.setFontSize(11.25);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 155, 165);
      doc.text(
        `Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
        margin,
        finalY
      );
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...OOCL_BLUE);
      doc.text("OOCL — BL Tracking System", pageWidth - margin, finalY, { align: "right" });

      doc.setFillColor(...OOCL_BLUE);
      doc.rect(0, doc.internal.pageSize.getHeight() - 3, pageWidth, 3, "F");

      const navire = (voyage.navire?.nom || "voyage").replace(/\s+/g, "_");
      const numero = (voyage.numero || "").replace(/\s+/g, "_");
      const date = voyage.etd ? format(new Date(voyage.etd), "ddMMyyyy") : "nd";
      doc.save(`Facturation_${navire}_${numero}_${date}.pdf`);

    } catch (err) {
      console.error("Erreur génération PDF:", err);
      alert("Erreur lors de la génération du PDF.\n\nDétails : " + String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-card rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-brand-border">

        {/* --- Header --- */}
        <div className="p-5 md:p-6 border-b border-brand-border bg-brand-surface/30 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary animate-pulse-ring">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text tracking-tight">Panneau de Facturation</h2>
              <div className="flex items-center gap-3 mt-0.5 text-brand-text-muted font-bold text-xs">
                <span className="flex items-center gap-1.5 uppercase"><Ship className="w-4 h-4 text-primary" /> {voyage.navire?.nom} {voyage.numero}</span>
                <span className="opacity-40">|</span>
                <span className="flex items-center gap-1.5 uppercase"><Calendar className="w-4 h-4 text-secondary" /> ETD : {voyage.etd ? format(new Date(voyage.etd), "dd/MM/yyyy") : "-"}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-surface rounded-full transition-all text-brand-text-muted active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Controls --- */}
        <div className="px-6 py-5 bg-brand-surface/20 border-b border-brand-border flex-shrink-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-5">
            {/* Dollar exchange input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-red-500" /> Taux du Dollar
                </label>
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Sauvegarde...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Enregistré
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-red-500">
                    <AlertCircle className="w-2.5 h-2.5" /> Erreur
                  </span>
                )}
              </div>
              <input
                type="text"
                className="px-4 py-2.5 rounded-xl border-2 border-brand-border-highlight focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-black text-red-500 bg-brand-card w-44 text-sm shadow-sm transition-all text-center"
                value={formatAmount(tauxDollar)}
                onChange={(e) => setTauxDollar(unformatAmount(e.target.value))}
                placeholder="Ex : 600 XOF"
              />
            </div>

            {/* Display column toggles */}
            <div className="space-y-1.5 flex-1">
              <label className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest">Charges affichées dans l'export</label>
              <div className="flex flex-wrap gap-1.5">
                {["Taxe de Port", ...otherChargeTypes].map(col => (
                  <button
                    key={col}
                    onClick={() => toggleColumn(col)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      visibleColumns[col]
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-border-highlight"
                    }`}
                  >
                    {visibleColumns[col] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Download PDF button */}
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="bg-slate-800 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/5 disabled:opacity-60 border border-transparent"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Télécharger l'acte PDF
            </button>
          </div>
        </div>

        {/* --- Preview list --- */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">
              Aperçu du tableau de facturation (Format d'édition)
            </p>
          </div>
          
          <div className="border border-brand-border rounded-2xl overflow-hidden shadow-lg shadow-black/5 bg-brand-card">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-brand-surface/40 text-brand-text-muted font-black uppercase tracking-widest text-[9px] border-b border-brand-border">
                  <th className="px-5 py-3">N° Booking</th>
                  <th className="px-5 py-3">Shipper (Chargeur)</th>
                  {activeColumns.map(col => (
                    <th key={col} className="px-4 py-3 text-center text-brand-text font-black uppercase whitespace-nowrap bg-brand-surface/20">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {voyage.bls.map((bl: any, i: number) => (
                  <tr key={bl.id} className="hover:bg-brand-surface/10 transition-colors">
                    <td className="px-5 py-3 font-mono font-black text-brand-text text-xs whitespace-nowrap">OOLU{bl.booking}</td>
                    <td className="px-5 py-3 text-brand-text-dim font-bold truncate max-w-xs">{bl.shipper || <span className="italic opacity-50 font-normal">Sans chargeur</span>}</td>
                    {activeColumns.map(col => {
                      let val = "";
                      if (col === "Taxe de Port") val = "X";
                      else {
                        const charge = bl.autresCharges?.find((c: any) => c.type === col);
                        val = formatAmount(charge?.montant) || "";
                      }
                      return (
                        <td key={col} className="px-4 py-3 text-center font-black text-brand-text font-mono text-xs">
                          {val || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* USD Missing Error Modal */}
      {showError && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-brand-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-brand-border animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-red-500/10 p-4 rounded-full ring-8 ring-red-500/5">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-brand-text mb-1 uppercase tracking-wider">Taux dollar obligatoire</h3>
                <p className="text-brand-text-muted text-xs font-semibold leading-relaxed">
                  Certains connaissements de ce voyage possèdent un fret libellé en <span className="text-red-500 font-bold">USD</span>.<br/> 
                  Vous devez obligatoirement saisir le taux de change du dollar pour permettre la conversion en XOF dans l'acte PDF.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowError(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-black/20"
              >
                Je renseigne le taux
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
