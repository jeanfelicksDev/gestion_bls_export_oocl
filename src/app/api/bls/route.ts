import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Basic validation
    if (!body.booking || !body.voyageId) {
      return NextResponse.json({ error: "Booking et VoyageId requis" }, { status: 400 });
    }

    const bl = await prisma.bL.create({
      data: {
        booking: String(body.booking),
        voyageId: body.voyageId,
        statut: body.statut || null,
        dateRetrait: body.dateRetrait ? new Date(body.dateRetrait) : null,
        pod: body.pod || null,
        shipper: body.shipper || null,
        typeConnaissement: body.typeConnaissement || null,
        tender: body.tender || null,
        freighting: body.freighting || null,
        valeurFret: body.valeurFret || null,
        montantFret: body.montantFret || null,
        deviseFret: body.deviseFret || null,
        statutFret: body.statutFret || null,
        numTimbre: body.numTimbre || null,
        statutCorrection: body.statutCorrection || null,
        commentaire: body.commentaire || null,
        raisonRetour: body.raisonRetour || null,
        dateRetour: body.dateRetour ? new Date(body.dateRetour) : null,
        numFactureRetour: body.numFactureRetour || null,
        autresCharges: body.autresCharges ? {
          create: body.autresCharges.map((c: any) => ({
            type: c.type,
            montant: String(c.montant || ""),
            observation: c.observation || null
          }))
        } : undefined
      },
      include: {
        autresCharges: true
      }
    });

    return NextResponse.json(bl);
  } catch (error: any) {
    console.error("API Error (BL Creation):", error);
    // Handle unique constraint on booking if necessary
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Ce numéro de booking existe déjà" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
