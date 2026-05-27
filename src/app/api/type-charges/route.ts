import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, validators } from "@/lib/validation";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { ErrorCode } from "@/lib/types";

const CONTEXT = "API_TYPE_CHARGES";

export async function GET() {
  try {
    logger.debug(CONTEXT, "GET all type charges");

    const types = await prisma.typeCharge.findMany({
      orderBy: { nom: "asc" },
    });

    logger.info(CONTEXT, `Retrieved ${types.length} types`);
    return successResponse(types);
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
        "Nom de type charge invalide ou manquant"
      );
    }

    const { nom } = body as { nom: string };
    const normalizedNom = nom.trim().toUpperCase();
    logger.debug(CONTEXT, "POST creating type charge", { nom: normalizedNom });

    const typeCharge = await prisma.typeCharge.upsert({
      where: { nom: normalizedNom },
      update: {},
      create: { nom: normalizedNom },
    });

    logger.info(CONTEXT, `Type charge created/updated`, {
      typeId: typeCharge.id,
      nom: typeCharge.nom,
    });
    return successResponse(typeCharge, "Type charge créé/mis à jour avec succès");
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

