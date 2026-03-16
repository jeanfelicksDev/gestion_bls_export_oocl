"use client";

import React, { useState, useMemo } from "react";
import { X, FileDown, Eye, EyeOff, DollarSign, Ship, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BillingModalProps {
  voyage: any;
  onClose: () => void;
}

// Couleurs OOCL
const OOCL_BLUE = [0, 47, 108] as [number, number, number];      // #002F6C
const OOCL_RED  = [200, 16, 46] as [number, number, number];      // #C8102E
const LIGHT_BLUE = [235, 241, 251] as [number, number, number];   // En-tête tableau
const CHARGES_BLUE = [218, 230, 248] as [number, number, number]; // En-tête sous-section charges
const ROW_ALT = [249, 250, 252] as [number, number, number];      // Lignes alternées

export default function BillingModal({ voyage, onClose }: BillingModalProps) {
  const [tauxDollar, setTauxDollar] = useState("600 XOF");
  const [isGenerating, setIsGenerating] = useState(false);

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
    setIsGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();  // 297mm
      const margin = 12;
      let y = margin;

      // ════════════════════════════════════════════════════════
      //  BANNIÈRE OOCL (bande bleue pleine largeur)
      // ════════════════════════════════════════════════════════
      doc.setFillColor(...OOCL_BLUE);
      doc.rect(0, 0, pageWidth, 22, "F");

      // Trait rouge accent
      doc.setFillColor(...OOCL_RED);
      doc.rect(0, 22, pageWidth, 1.5, "F");

      // Titre dans la bannière
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("TABLEAU DE FACTURATION", pageWidth / 2, 15, { align: "center" });

      // Sous-titre voyage à droite de la bannière
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 240);
      doc.text(`${voyage.navire?.nom || ""} · ${voyage.numero || ""}`, pageWidth - margin, 19, { align: "right" });

      y = 30;

      // ════════════════════════════════════════════════════════
      //  BLOC INFOS (3 colonnes)
      // ════════════════════════════════════════════════════════
      doc.setTextColor(0, 0, 0);
      const labelGray: [number, number, number] = [100, 100, 100];
      const col1x = margin;
      const col2x = margin + 80;
      const col3x = margin + 165;

      // -- Colonne 1 : Navire
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelGray);
      doc.text("NAVIRE", col1x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(voyage.navire?.nom || "-", col1x, y + 8);

      // -- Colonne 2 : Voyage + ETD
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

      // -- Colonne 3 : Taux Dollar (accentué)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelGray);
      doc.text("TAUX DU DOLLAR", col3x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(...OOCL_RED);
      doc.text(tauxDollar, col3x, y + 9);

      // Ligne de séparation
      y += 22;
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // ════════════════════════════════════════════════════════
      //  CALCUL DES LARGEURS DE COLONNES
      // ════════════════════════════════════════════════════════
      const availWidth = pageWidth - margin * 2;
      const minBookingWidth = 34; // Minimum width for Booking
      const minShipperWidth = 58; // Minimum width for Shipper
      const minChargeWidth = 22;  // Minimum width for each charge column

      // Calculate max content width for Booking and Shipper
      doc.setFont("courier", "bold");
      doc.setFontSize(13);
      const maxBookingContentWidth = Math.max(
        doc.getTextWidth("BOOKING"),
        ...voyage.bls.map((bl: any) => doc.getTextWidth(bl.booking || ""))
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const maxShipperContentWidth = Math.max(
        doc.getTextWidth("SHIPPER"),
        ...voyage.bls.map((bl: any) => doc.getTextWidth(bl.shipper || ""))
      );

      // Calculate max content width for each active charge column
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const chargeContentWidths = activeColumns.map(col => {
        const headerWidth = doc.getTextWidth(col.toUpperCase());
        // For 'Taxe de Port', content is 'X'
        if (col === "Taxe de Port") {
          doc.setFontSize(13); // Body font size for 'X'
          const contentWidth = doc.getTextWidth("X");
          return Math.max(headerWidth, contentWidth);
        } else {
          // For other charges, content is the amount
          doc.setFontSize(13); // Body font size for amounts
          const maxAmountWidth = Math.max(
            ...voyage.bls.map((bl: any) => {
              const charge = bl.autresCharges?.find((c: any) => c.type === col);
              return doc.getTextWidth(charge?.montant?.toString() || "");
            })
          );
          return Math.max(headerWidth, maxAmountWidth);
        }
      });

      // Add some padding to content widths
      const PADDING = 6; // 3mm on each side
      const bookingWidth = Math.max(minBookingWidth, maxBookingContentWidth + PADDING);
      const shipperWidth = Math.max(minShipperWidth, maxShipperContentWidth + PADDING);
      const chargeWidths = chargeContentWidths.map(w => Math.max(minChargeWidth, w + PADDING));

      const totalCalculatedWidth = bookingWidth + shipperWidth + chargeWidths.reduce((sum, w) => sum + w, 0);

      // Distribute remaining space if available, or shrink proportionally if over
      let finalBookingWidth = bookingWidth;
      let finalShipperWidth = shipperWidth;
      let finalChargeWidths = [...chargeWidths];

      if (totalCalculatedWidth < availWidth) {
        const remainingSpace = availWidth - totalCalculatedWidth;
        // Distribute remaining space to shipper column
        finalShipperWidth += remainingSpace;
      } else if (totalCalculatedWidth > availWidth) {
        // If total width exceeds available, shrink proportionally
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
          fontSize: 13,
        };
      });

      // ════════════════════════════════════════════════════════
      //  DONNÉES DU TABLEAU
      // ════════════════════════════════════════════════════════
      const body: any[][] = voyage.bls.map((bl: any) => {
        const row: any[] = [bl.booking || "", bl.shipper || "-"];
        activeColumns.forEach(col => {
          if (col === "Taxe de Port") {
            row.push("X");
          } else {
            const charge = bl.autresCharges?.find((c: any) => c.type === col);
            row.push(charge?.montant || "");
          }
        });
        return row;
      });

      // Compléter jusqu'à 15 lignes minimum
      const minRows = 15;
      while (body.length < minRows) {
        body.push(["", "", ...activeColumns.map(() => "")]);
      }

      // ════════════════════════════════════════════════════════
      //  AUTOMAP — DOUBLE EN-TÊTE GROUPÉ
      // ════════════════════════════════════════════════════════
      autoTable(doc, {
        startY: y,
        head: [
          // rang 1 : colonnes fixes + groupe CHARGES
          [
            { content: "BOOKING", rowSpan: 2, styles: { valign: "middle", halign: "left", fontStyle: "bold", fontSize: 12 } },
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
          // rang 2 : sous-colonnes des charges
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
        // Styles généraux
        styles: {
          fontSize: 13,
          cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
          lineWidth: 0.25,
          lineColor: [210, 218, 230] as [number, number, number],
          textColor: [30, 30, 40] as [number, number, number],
          font: "helvetica",
          overflow: "linebreak",
          minCellHeight: 8,
        },
        headStyles: {
          fillColor: LIGHT_BLUE,
          textColor: OOCL_BLUE,
          fontStyle: "bold",
          lineWidth: 0.3,
          lineColor: [180, 200, 230] as [number, number, number],
        },
        // Lignes alternées
        didParseCell: (data) => {
          if (data.section === "body" && data.row.index % 2 === 0) {
            data.cell.styles.fillColor = [255, 255, 255];
          } else if (data.section === "body") {
            data.cell.styles.fillColor = ROW_ALT;
          }
        },
        // Bordure extérieure plus marquée
        tableLineWidth: 0.5,
        tableLineColor: [160, 180, 210] as [number, number, number],
      });

      // ════════════════════════════════════════════════════════
      //  PIED DE PAGE
      // ── Pied de page ───────────────────────────────────────────────
      const finalY = (doc as any).lastAutoTable.finalY + 9; // 6 * 1.5
      doc.setFontSize(11.25); // 7.5 * 1.5
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

      // Trait bleu en bas
      doc.setFillColor(...OOCL_BLUE);
      doc.rect(0, doc.internal.pageSize.getHeight() - 3, pageWidth, 3, "F");

      // ── Téléchargement ─────────────────────────────────────────────
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
      <div className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">

        {/* ── Header ── */}
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Ship className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tableau de Facturation</h2>
              <div className="flex items-center gap-4 mt-1 text-gray-500 font-medium">
                <span className="flex items-center gap-2 text-sm"><Ship className="w-4 h-4" /> {voyage.navire?.nom} {voyage.numero}</span>
                <span className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4" /> ETD : {voyage.etd ? format(new Date(voyage.etd), "dd/MM/yyyy") : "-"}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ── Controls ── */}
        <div className="px-8 py-5 bg-gray-50/70 border-b border-gray-100 flex-shrink-0">
          <div className="flex flex-wrap items-end gap-8">
            {/* Taux dollar */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" /> Taux du Dollar
              </label>
              <input
                type="text"
                className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none font-bold text-red-600 bg-white w-32 text-sm"
                value={tauxDollar}
                onChange={(e) => setTauxDollar(e.target.value)}
                placeholder="Ex: 600 XOF"
              />
            </div>

            {/* Colonnes */}
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Colonnes affichées</label>
              <div className="flex flex-wrap gap-2">
                {["Taxe de Port", ...otherChargeTypes].map(col => (
                  <button
                    key={col}
                    onClick={() => toggleColumn(col)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      visibleColumns[col]
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-white border-gray-200 text-gray-400"
                    }`}
                  >
                    {visibleColumns[col] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton PDF */}
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="bg-[#002F6C] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#003d8f] transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Génération...</>
                : <><FileDown className="w-5 h-5" /> Télécharger PDF</>
              }
            </button>
          </div>
        </div>

        {/* ── Aperçu tableau ── */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-[11px] text-gray-400 mb-3 font-medium italic">
            Aperçu — format A4 paysage avec colonnes charges réduites
          </p>
          <table className="w-full border-collapse text-sm border border-blue-200/60">
            <thead>
              {activeColumns.length > 0 && (
                <tr>
                  <th className="border border-blue-200/60 px-4 py-2.5 text-left text-[10px] font-black text-[#002F6C] uppercase bg-[#EBF1FB]" rowSpan={2}>Booking</th>
                  <th className="border border-blue-200/60 px-4 py-2.5 text-left text-[10px] font-black text-[#002F6C] uppercase bg-[#EBF1FB]" rowSpan={2}>Shipper</th>
                  <th className="border border-blue-200/60 px-2 py-2 text-center text-[10px] font-black text-[#002F6C] uppercase bg-[#DAE6F8]" colSpan={activeColumns.length}>
                    Charges
                  </th>
                </tr>
              )}
              <tr className="bg-[#EBF1FB]">
                {activeColumns.length === 0 && (
                  <>
                    <th className="border border-blue-200/60 px-4 py-2.5 text-[10px] font-black text-[#002F6C] uppercase text-left">Booking</th>
                    <th className="border border-blue-200/60 px-4 py-2.5 text-[10px] font-black text-[#002F6C] uppercase text-left">Shipper</th>
                  </>
                )}
                {activeColumns.map(col => (
                  <th key={col} className="border border-blue-200/60 px-2 py-2 text-center text-[10px] font-black text-blue-700 uppercase bg-[#DAE6F8] whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {voyage.bls.map((bl: any, i: number) => (
                <tr key={bl.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F9FAFC]"}>
                  <td className="border border-blue-100 px-4 py-3 font-mono font-bold text-gray-800 text-sm whitespace-nowrap">{bl.booking}</td>
                  <td className="border border-blue-100 px-4 py-3 text-gray-600 text-sm truncate max-w-xs">{bl.shipper || "-"}</td>
                  {activeColumns.map(col => {
                    let val = "";
                    if (col === "Taxe de Port") val = "X"; // Changed from "✓" to "X"
                    else {
                      const charge = bl.autresCharges?.find((c: any) => c.type === col);
                      val = charge?.montant || "";
                    }
                    return (
                      <td key={col} className="border border-blue-100 px-2 py-3 text-center font-bold text-blue-700 text-sm whitespace-nowrap">
                        {val}
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
  );
}
