import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";
import { IBLInput } from "@/lib/types";

const CONTEXT = "API_BLS_BATCH";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    logger.debug(CONTEXT, "POST batch create/update BLs");
    
    if (!body || typeof body !== "object" || !("bls" in body)) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { bls, voyageId } = body as { bls: unknown; voyageId?: string | null };

    if (!bls || !Array.isArray(bls)) {
      return NextResponse.json({ error: "Un tableau de BLs est requis" }, { status: 400 });
    }

    if (voyageId && !validators.isValidId(voyageId)) {
      return NextResponse.json({ error: "ID de voyage invalide" }, { status: 400 });
    }
    
    let successCount = 0;
    
    // We process sequentially to ensure reliable upserts on SQLite/Neon
    for (const item of bls) {
       const bl = item as IBLInput;
       if (!bl.booking) continue;
       
       const bookingStr = String(bl.booking).trim().toUpperCase();
       if (bookingStr.length < 3) continue;

       // Define static create/update structures to keep strict type-safety
       const updateData: Prisma.BLUpdateInput = {
         voyageId: voyageId || null,
         pod: bl.pod ? String(bl.pod).trim() : undefined,
         shipper: bl.shipper ? String(bl.shipper).trim() : undefined,
         valeurFret: bl.valeurFret ? String(bl.valeurFret).trim() : undefined,
         montantFret: bl.montantFret ? String(bl.montantFret).trim() : undefined,
         statutCorrection: bl.statutCorrection ? String(bl.statutCorrection).trim() : undefined,
         statutFret: bl.statutFret ? String(bl.statutFret).trim() : undefined,
         numTimbre: bl.numTimbre ? String(bl.numTimbre).trim() : undefined,
         dateRetrait: bl.dateRetrait ? new Date(bl.dateRetrait as string) : undefined,
         statut: bl.dateRetrait ? "RETIRE" : undefined,
         commentaire: (bl.commentaire && String(bl.commentaire).trim() !== "") ? String(bl.commentaire).trim() : undefined,
       };

       const createData: Prisma.BLCreateInput = {
         booking: bookingStr,
         voyageId: voyageId || null,
         pod: bl.pod ? String(bl.pod).trim() : null,
         shipper: bl.shipper ? String(bl.shipper).trim() : null,
         valeurFret: bl.valeurFret ? String(bl.valeurFret).trim() : "",
         montantFret: bl.montantFret ? String(bl.montantFret).trim() : "",
         statutCorrection: bl.statutCorrection ? String(bl.statutCorrection).trim() : "",
         statutFret: bl.statutFret ? String(bl.statutFret).trim() : "",
         numTimbre: bl.numTimbre ? String(bl.numTimbre).trim() : "",
         dateRetrait: bl.dateRetrait ? new Date(bl.dateRetrait as string) : null,
         statut: bl.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT",
         commentaire: (bl.commentaire && String(bl.commentaire).trim() !== "") ? String(bl.commentaire).trim() : null,
       };

       await prisma.bL.upsert({
         where: { booking: bookingStr },
         update: updateData,
         create: createData,
       });
       
       successCount++;
    }

    logger.info(CONTEXT, `Successfully upserted ${successCount} BLs in batch`);
    return successResponse({ success: true, count: successCount }, `${successCount} BLs traités en lot`);
    
  } catch (error) {
    logger.error(CONTEXT, "POST batch error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

