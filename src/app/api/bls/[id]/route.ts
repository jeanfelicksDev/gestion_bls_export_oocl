import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";
import { IAutreChargeInput } from "@/lib/types";

const CONTEXT = "API_BL_DETAIL";

export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body: unknown = await req.json();
    logger.debug(CONTEXT, "PATCH updating BL", { id, body });

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;

    // Use a transaction to ensure atomic delete of old charges and creation of new ones
    const bl = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update the BL itself
      const updatedBl = await tx.bL.update({
        where: { id },
        data: {
          statut: data.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT",
          dateRetrait: data.dateRetrait ? new Date(data.dateRetrait as string) : null,
          pod: (data.pod as string) || null,
          shipper: (data.shipper as string) || null,
          typeConnaissement: (data.typeConnaissement as string) || null,
          tender: (data.tender as string) || null,
          freighting: (data.freighting as string) || null,
          valeurFret: (data.valeurFret as string) || null,
          montantFret: (data.montantFret as string) || null,
          deviseFret: (data.deviseFret as string) || null,
          statutFret: (data.statutFret as string) || null,
          numTimbre: (data.numTimbre as string) || null,
          statutCorrection: (data.statutCorrection as string) || null,
          commentaire: (data.commentaire as string) || null,
          raisonRetour: (data.raisonRetour as string) || null,
          dateRetour: data.dateRetour ? new Date(data.dateRetour as string) : null,
          numFactureRetour: (data.numFactureRetour as string) || null,
          isORG: typeof data.isORG !== 'undefined' ? Boolean(data.isORG) : undefined,
          isNNG: typeof data.isNNG !== 'undefined' ? Boolean(data.isNNG) : undefined,
          isSWB: typeof data.isSWB !== 'undefined' ? Boolean(data.isSWB) : undefined,
          isScanne: typeof data.isScanne !== 'undefined' ? Boolean(data.isScanne) : undefined,
          isNoteTraitee: typeof data.isNoteTraitee !== 'undefined' ? Boolean(data.isNoteTraitee) : undefined,
        },
      });

      // 2. Refresh charges if provided
      if (data.autresCharges && Array.isArray(data.autresCharges)) {
        // Delete old
        await tx.autreCharge.deleteMany({
          where: { blId: id },
        });

        // Create new individually (safer for SQLite transactions)
        for (const item of data.autresCharges) {
          const c = item as IAutreChargeInput;
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

    logger.info(CONTEXT, "BL updated successfully via transaction", { blId: id });
    return successResponse(bl, "BL mis à jour avec succès");
  } catch (error) {
    logger.error(CONTEXT, "PATCH transaction error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    logger.debug(CONTEXT, "DELETE BL", { id });

    await prisma.bL.delete({
      where: { id },
    });

    logger.info(CONTEXT, "BL deleted successfully", { blId: id });
    return successResponse({ success: true }, "BL supprimé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}


