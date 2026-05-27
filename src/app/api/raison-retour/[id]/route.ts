import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";

const CONTEXT = "API_RAISON_RETOUR_DETAIL";

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
    logger.debug(CONTEXT, "PATCH updating raison retour", { id, body });

    if (!body || typeof body !== "object" || !("nom" in body)) {
      return NextResponse.json({ error: "Nom de raison retour requis" }, { status: 400 });
    }

    const { nom } = body as { nom: string };
    if (!validators.isNonEmptyString(nom)) {
      return NextResponse.json({ error: "Nom ne peut pas être vide" }, { status: 400 });
    }

    const raison = await prisma.raisonRetour.update({
      where: { id },
      data: { nom: nom.trim() },
    });

    logger.info(CONTEXT, "Raison retour updated successfully", { raisonId: raison.id });
    return successResponse(raison, "Raison retour mise à jour avec succès");
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
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    logger.debug(CONTEXT, "DELETE raison retour", { id });

    await prisma.raisonRetour.delete({
      where: { id },
    });

    logger.info(CONTEXT, "Raison retour deleted successfully", { raisonId: id });
    return successResponse({ success: true }, "Raison retour supprimée avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

