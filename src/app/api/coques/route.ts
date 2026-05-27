import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, validators } from "@/lib/validation";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { ErrorCode } from "@/lib/types";

const CONTEXT = "API_COQUES";

export async function GET() {
  try {
    logger.debug(CONTEXT, "GET all coques");

    const coques = await prisma.coque.findMany({
      orderBy: { nom: "asc" },
    });

    logger.info(CONTEXT, `Retrieved ${coques.length} coques`);
    return successResponse(coques);
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
        "Nom de coque invalide ou manquant"
      );
    }

    const { nom } = body as { nom: string };
    logger.debug(CONTEXT, "POST creating coque", { nom });

    const coque = await prisma.coque.upsert({
      where: { nom },
      update: {},
      create: { nom },
    });

    logger.info(CONTEXT, `Coque created/updated`, { coqueId: coque.id, nom });
    return successResponse(coque, "Coque créée/mise à jour avec succès");
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

