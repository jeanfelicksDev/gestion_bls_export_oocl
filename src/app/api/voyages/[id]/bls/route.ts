import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/voyages/[id]/bls — Ajoute des BLs à un voyage existant (upsert)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { bls } = await req.json();

    if (!Array.isArray(bls) || bls.length === 0) {
      return NextResponse.json({ error: "Aucun BL fourni" }, { status: 400 });
    }

    // Upsert each BL (update if booking exists, create otherwise)
    const results = [];
    for (const bl of bls) {
      const booking = String(bl.booking);
      const result = await prisma.bL.upsert({
        where: { booking },
        update: {
          pod: bl.pod ?? undefined,
          shipper: bl.shipper ?? undefined,
          statut: bl.statut ?? undefined,
          typeConnaissement: bl.typeConnaissement ?? undefined,
          tender: String(bl.tender || ""),
          freighting: String(bl.freighting || ""),
          valeurFret: String(bl.valeurFret || ""),
        },
        create: {
          booking,
          voyageId: id,
          pod: bl.pod,
          shipper: bl.shipper,
          statut: bl.statut,
          typeConnaissement: bl.typeConnaissement,
          tender: String(bl.tender || ""),
          freighting: String(bl.freighting || ""),
          valeurFret: String(bl.valeurFret || ""),
        },
      });
      results.push(result);
    }

    return NextResponse.json({ created: results.length });
  } catch (error: any) {
    console.error("BL upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
