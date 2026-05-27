import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";
import { IBLInput } from "@/lib/types";

const CONTEXT = "API_VOYAGES_BLS";

// POST /api/voyages/[id]/bls — Ajoute des BLs à un voyage existant (upsert)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID de voyage invalide" }, { status: 400 });
    }

    const body: unknown = await req.json();
    logger.debug(CONTEXT, "POST upload BLs to voyage", { id });

    if (!body || typeof body !== "object" || !("bls" in body)) {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { bls } = body as { bls: unknown };

    if (!Array.isArray(bls) || bls.length === 0) {
      return NextResponse.json({ error: "Aucun BL fourni ou format invalide" }, { status: 400 });
    }

    // Upsert each BL (update if booking exists, create otherwise)
    const results = [];
    for (const item of bls) {
      const bl = item as IBLInput;
      if (!bl.booking) continue;

      const booking = String(bl.booking).trim().toUpperCase();
      const result = await prisma.bL.upsert({
        where: { booking },
        update: {
          pod: bl.pod ?? undefined,
          shipper: bl.shipper ?? undefined,
          statut: bl.statut ?? undefined,
          typeConnaissement: bl.typeConnaissement ?? undefined,
          tender: bl.tender ? String(bl.tender) : undefined,
          freighting: bl.freighting ? String(bl.freighting) : undefined,
          valeurFret: bl.valeurFret ? String(bl.valeurFret) : undefined,
        },
        create: {
          booking,
          voyageId: id,
          pod: bl.pod ?? null,
          shipper: bl.shipper ?? null,
          statut: bl.statut ?? null,
          typeConnaissement: bl.typeConnaissement ?? null,
          tender: bl.tender ? String(bl.tender) : "",
          freighting: bl.freighting ? String(bl.freighting) : "",
          valeurFret: bl.valeurFret ? String(bl.valeurFret) : "",
        },
      });
      results.push(result);
    }

    logger.info(CONTEXT, `Successfully upserted ${results.length} BLs for voyage`, { voyageId: id });
    return successResponse({ created: results.length }, `${results.length} BLs traités avec succès`);
  } catch (error) {
    logger.error(CONTEXT, "POST error during BL upload", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

