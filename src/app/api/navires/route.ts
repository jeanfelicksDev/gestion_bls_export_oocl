import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateNavireInput, ValidationError } from "@/lib/validation";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { INavireInput } from "@/lib/types";

const CONTEXT = "API_NAVIRES";

export async function GET() {
  try {
    logger.debug(CONTEXT, "GET all navires");

    const navires = await prisma.navire.findMany({
      orderBy: { nom: "asc" },
      include: { coque: true },
    });

    logger.info(CONTEXT, `Retrieved ${navires.length} navires`);
    return successResponse(navires);
  } catch (error) {
    logger.error(CONTEXT, "GET error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    // Validate input
    validateNavireInput(body);

    const navireInput = body as INavireInput;

    logger.debug(CONTEXT, "POST creating navire", { nom: navireInput.nom });

    const navire = await prisma.navire.upsert({
      where: { nom: navireInput.nom },
      update: { coqueId: navireInput.coqueId || undefined },
      create: { nom: navireInput.nom, coqueId: navireInput.coqueId || undefined },
      include: { coque: true },
    });

    logger.info(CONTEXT, `Navire created/updated`, {
      navireId: navire.id,
      nom: navire.nom,
    });

    return successResponse(navire, "Navire créé/mis à jour avec succès");
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
