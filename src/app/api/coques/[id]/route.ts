import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";

const CONTEXT = "API_COQUE_DETAIL";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    logger.debug(CONTEXT, "DELETE coque", { id });
    
    // Check if any navire uses this coque
    const navires = await prisma.navire.count({
      where: { coqueId: id }
    });

    if (navires > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer : cette coque est utilisée par des navires." },
        { status: 400 }
      );
    }

    await prisma.coque.delete({
      where: { id },
    });

    logger.info(CONTEXT, "Coque deleted successfully", { coqueId: id });
    return successResponse({ success: true }, "Coque supprimée avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

