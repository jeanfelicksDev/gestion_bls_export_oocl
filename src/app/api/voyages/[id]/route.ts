import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";

const CONTEXT = "API_VOYAGES_DETAIL";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID de voyage invalide" }, { status: 400 });
    }

    const body: unknown = await req.json();
    logger.debug(CONTEXT, "PATCH updating voyage", { id, body });

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;

    const voyage = await prisma.voyage.update({
      where: { id },
      data: {
        etdConfirmed: data.etdConfirmed !== undefined ? Boolean(data.etdConfirmed) : undefined,
        etd: data.etd ? new Date(data.etd as string) : undefined,
        eta: data.eta ? new Date(data.eta as string) : undefined,
        tauxDollar: data.tauxDollar !== undefined ? String(data.tauxDollar) : undefined,
      },
    });

    logger.info(CONTEXT, "Voyage updated successfully", { voyageId: voyage.id });
    return successResponse(voyage, "Voyage mis à jour avec succès");
  } catch (error) {
    logger.error(CONTEXT, "PATCH error", error as Error);
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
      return NextResponse.json({ error: "ID de voyage invalide" }, { status: 400 });
    }

    logger.debug(CONTEXT, "DELETE voyage", { id });

    await prisma.voyage.delete({
      where: { id },
    });

    logger.info(CONTEXT, "Voyage deleted successfully", { voyageId: id });
    return successResponse({ success: true }, "Voyage supprimé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

