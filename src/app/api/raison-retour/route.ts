import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, validators } from "@/lib/validation";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { ErrorCode } from "@/lib/types";

const CONTEXT = "API_RAISON_RETOUR";

export async function GET() {
  try {
    logger.debug(CONTEXT, "GET all raisons retour");

    const raisons = await prisma.raisonRetour.findMany({
      orderBy: { nom: "asc" },
    });

    logger.info(CONTEXT, `Retrieved ${raisons.length} raisons`);
    return successResponse(raisons);
  } catch (error) {
    logger.error(CONTEXT, "GET error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const data = body as { nom?: string };

    if (!body || typeof body !== "object" || !validators.isNonEmptyString(data.nom)) {
      throw new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        "Nom de raison retour invalide ou manquant"
      );
    }

    const { nom } = body as { nom: string };
    const normalizedNom = nom.trim();
    logger.debug(CONTEXT, "POST creating raison retour", { nom: normalizedNom });

    const raison = await prisma.raisonRetour.upsert({
      where: { nom: normalizedNom },
      update: {},
      create: { nom: normalizedNom },
    });

    logger.info(CONTEXT, `Raison retour created/updated`, {
      raisonId: raison.id,
      nom: raison.nom,
    });
    return successResponse(raison, "Raison retour créée/mise à jour avec succès");
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

