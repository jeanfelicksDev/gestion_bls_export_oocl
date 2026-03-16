import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Use a transaction to ensure atomic delete of old charges and creation of new ones
    const bl = await prisma.$transaction(async (tx: any) => {
      // 1. Update the BL itself
      const updatedBl = await tx.bL.update({
        where: { id },
        data: {
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
        },
      });

      // 2. Refresh charges if provided
      if (body.autresCharges) {
        // Delete old
        await tx.autreCharge.deleteMany({
          where: { blId: id },
        });

        // Create new individually (safer for SQLite transactions)
        for (const c of body.autresCharges) {
          if (c.type) {
            await tx.autreCharge.create({
              data: {
                blId: id,
                type: String(c.type),
                montant: String(c.montant || ""),
                observation: c.observation || null
              }
            });
          }
        }
      }

      return await tx.bL.findUnique({
        where: { id },
        include: { autresCharges: true }
      });
    });

    return NextResponse.json(bl);
  } catch (error: any) {
    console.error("DEBUG - BL Update Error:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: error.message,
      details: error.meta
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.bL.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

