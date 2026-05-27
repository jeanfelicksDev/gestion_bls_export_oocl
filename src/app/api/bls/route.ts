import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBLInput, ValidationError } from "@/lib/validation";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { IBLInput, IBL } from "@/lib/types";

const CONTEXT = "API_BLS";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voyageId = searchParams.get("voyageId");
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "50");

    logger.debug(CONTEXT, "GET request", { voyageId, skip, take });

    const where = voyageId ? { voyageId } : undefined;

    const [bls, total] = await Promise.all([
      prisma.bL.findMany({
        where,
        skip,
        take,
        include: {
          autresCharges: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bL.count({ where }),
    ]);

    logger.info(CONTEXT, `Retrieved ${bls.length} BLs`);

    return successResponse({
      data: bls,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    });
  } catch (error) {
    logger.error(CONTEXT, "GET error", error as Error);
    return handleApiError(CONTEXT, error, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    // Validate input
    validateBLInput(body);

    const blInput = body as IBLInput;

    logger.debug(CONTEXT, "POST creating BL", { booking: blInput.booking });

    const bl: IBL = await prisma.bL.create({
      data: {
        booking: String(blInput.booking),
        voyageId: blInput.voyageId,
        statut: blInput.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT",
        dateRetrait: blInput.dateRetrait
          ? new Date(blInput.dateRetrait)
          : null,
        pod: blInput.pod || null,
        shipper: blInput.shipper || null,
        typeConnaissement: blInput.typeConnaissement || null,
        tender: blInput.tender || null,
        freighting: blInput.freighting || null,
        valeurFret: blInput.valeurFret ? String(blInput.valeurFret) : null,
        montantFret: blInput.montantFret
          ? String(blInput.montantFret)
          : null,
        deviseFret: blInput.deviseFret || null,
        statutFret: blInput.statutFret || null,
        numTimbre: blInput.numTimbre || null,
        statutCorrection: blInput.statutCorrection || null,
        commentaire: blInput.commentaire || null,
        raisonRetour: blInput.raisonRetour || null,
        dateRetour: blInput.dateRetour
          ? new Date(blInput.dateRetour)
          : null,
        numFactureRetour: blInput.numFactureRetour || null,
        isORG: Boolean(blInput.isORG),
        isNNG: Boolean(blInput.isNNG),
        isSWB: Boolean(blInput.isSWB),
        isScanne: Boolean(blInput.isScanne),
        isNoteTraitee: Boolean(blInput.isNoteTraitee),
        autresCharges: blInput.autresCharges
          ? {
              create: blInput.autresCharges.map((c) => ({
                type: c.type,
                montant: String(c.montant || ""),
                observation: c.observation || null,
              })),
            }
          : undefined,
      },
      include: {
        autresCharges: true,
      },
    });

    logger.info(CONTEXT, `BL created successfully`, {
      blId: bl.id,
      booking: bl.booking,
    });

    return successResponse(bl, "BL créé avec succès");
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn(CONTEXT, "Validation error", error as Error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    logger.error(CONTEXT, "POST error", error as Error);
    return handleApiError(CONTEXT, error, 500);
  }
}
