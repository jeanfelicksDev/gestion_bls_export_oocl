import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateVoyageInput, ValidationError } from "@/lib/validation";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { IVoyageInput, IBL, ErrorCode } from "@/lib/types";

const CONTEXT = "API_VOYAGES";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const bodyObj = body as Record<string, unknown>;
    const { header, bls, manual } = bodyObj;

    // Manual creation
    if (manual) {
      validateVoyageInput(body);

      const voyage = await prisma.voyage.create({
        data: {
          navireId: bodyObj.navireId as string,
          numero: bodyObj.numero as string,
          eta: bodyObj.eta ? new Date(bodyObj.eta as string) : null,
          etd: bodyObj.etd ? new Date(bodyObj.etd as string) : null,
          tauxDollar: bodyObj.tauxDollar
            ? String(bodyObj.tauxDollar)
            : null,
        },
      });

      logger.info(CONTEXT, "Manual voyage created", {
        voyageId: voyage.id,
        numero: voyage.numero,
      });

      return successResponse(voyage, "Voyage créé avec succès");
    }

    // Excel creation (header structure: { navire, voyage, eta, etd })
    if (!header || !bls) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "En-tête et BLs requis"
      );
    }

    const headerObj = header as Record<string, unknown>;
    const blsArray = bls as unknown[];

    logger.debug(CONTEXT, "Creating voyage from Excel", {
      navire: headerObj.navire,
      voyage: headerObj.voyage,
      blCount: blsArray.length,
    });

    // Upsert Navire first
    const navire = await prisma.navire.upsert({
      where: { nom: String(headerObj.navire) },
      update: {},
      create: { nom: String(headerObj.navire) },
    });

    // Create Voyage linked to Navire
    const voyage = await prisma.voyage.create({
      data: {
        navireId: navire.id,
        numero: String(headerObj.voyage),
        eta: headerObj.eta ? new Date(headerObj.eta as string) : null,
        etd: headerObj.etd ? new Date(headerObj.etd as string) : null,
        tauxDollar: headerObj.tauxDollar
          ? String(headerObj.tauxDollar)
          : "600 XOF",
      },
      include: {
        navire: { include: { coque: true } },
      },
    });

    // Upsert each BL to handle existing orphans
    let createdCount = 0;
    let updatedCount = 0;

    for (const bl of blsArray) {
      const blObj = bl as Record<string, unknown>;
      const bookingStr = String(blObj.booking).trim().toUpperCase();
      if (!bookingStr) continue;

      const blData = {
        voyageId: voyage.id,
        pod: blObj.pod ? String(blObj.pod) : null,
        shipper: blObj.shipper ? String(blObj.shipper) : null,
        statutFret: blObj.statutFret ? String(blObj.statutFret) : null,
        typeConnaissement: blObj.typeConnaissement ? String(blObj.typeConnaissement) : null,
        montantFret: blObj.montantFret ? String(blObj.montantFret) : null,
        statutCorrection: blObj.statutCorrection ? String(blObj.statutCorrection) : null,
        numTimbre: blObj.numTimbre ? String(blObj.numTimbre) : null,
        dateRetrait: blObj.dateRetrait ? new Date(blObj.dateRetrait as string) : null,
        commentaire: blObj.commentaire && String(blObj.commentaire).trim() !== ""
          ? String(blObj.commentaire).trim()
          : null,
        deviseFret: String(blObj.deviseFret || "EUR"),
      } as const;

      const result = await prisma.bL.upsert({
        where: { booking: bookingStr },
        update: blData,
        create: {
          booking: bookingStr,
          ...blData,
        },
      });

      if (result.createdAt === result.updatedAt) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }

    // Refresh voyage data with bls
    const updatedVoyage = await prisma.voyage.findUnique({
      where: { id: voyage.id },
      include: {
        bls: {
          include: { autresCharges: true },
        },
        navire: { include: { coque: true } },
      },
    });

    logger.info(CONTEXT, "Voyage created from Excel", {
      voyageId: voyage.id,
      numero: voyage.numero,
      blsCreated: createdCount,
      blsUpdated: updatedCount,
    });

    return successResponse(
      updatedVoyage,
      `Voyage créé avec ${createdCount} BLs créés et ${updatedCount} BLs mis à jour`
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn(CONTEXT, "Validation error", error as Error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    logger.error(CONTEXT, "POST error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "1000");

    logger.debug(CONTEXT, "GET all voyages", { skip, take });

    const [voyages, total] = await Promise.all([
      prisma.voyage.findMany({
        include: {
          bls: {
            include: {
              autresCharges: true,
            },
          },
          navire: {
            include: { coque: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      prisma.voyage.count(),
    ]);

    // Get orphan BLs (BLs without voyage)
    const orphanBls = await prisma.bL.findMany({
      where: { voyageId: null },
      include: { autresCharges: true },
    });

    // Create virtual voyage for orphans if they exist
    const voyagesWithOrphans =
      orphanBls.length > 0
        ? [
            {
              id: "pre-vessel",
              numero: "SANS NAVIRE",
              navireId: null as string | null,
              navire: { id: "", nom: "DOSSIERS PRÉ-SAISIS", coqueId: null, createdAt: new Date(), updatedAt: new Date(), coque: null },
              bls: orphanBls,
              etd: null,
              eta: null,
              tauxDollar: null,
              etdConfirmed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            ...voyages,
          ]
        : voyages;

    logger.info(CONTEXT, `Retrieved ${voyages.length} voyages`, {
      orphanBlCount: orphanBls.length,
    });

    return successResponse({
      data: voyagesWithOrphans,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    });
  } catch (error) {
    logger.error(CONTEXT, "GET error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}
