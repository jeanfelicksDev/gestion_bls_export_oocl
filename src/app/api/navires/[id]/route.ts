import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";

const CONTEXT = "API_NAVIRES_[ID]";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: unknown = await req.json();

    if (!validators.isValidId(id)) {
      return NextResponse.json(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    logger.debug(CONTEXT, "PATCH navire", { id, nom: bodyObj.nom });

    const navire = await prisma.navire.update({
      where: { id },
      data: {
        nom: bodyObj.nom ? String(bodyObj.nom) : undefined,
        coqueId: bodyObj.coqueId ? String(bodyObj.coqueId) : null,
      },
      include: { coque: true },
    });

    logger.info(CONTEXT, "Navire updated", { navireId: navire.id });
    return successResponse(navire, "Navire mis à jour avec succès");
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
      return NextResponse.json(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    logger.debug(CONTEXT, "DELETE navire", { id });

    await prisma.navire.delete({
      where: { id },
    });

    logger.info(CONTEXT, "Navire deleted", { navireId: id });
    return successResponse({ success: true }, "Navire supprimé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}
