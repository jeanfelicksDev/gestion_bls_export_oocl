import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";

const CONTEXT = "API_TYPE_CHARGES_[ID]";

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

    logger.debug(CONTEXT, "DELETE type charge", { id });

    await prisma.typeCharge.delete({
      where: { id },
    });

    logger.info(CONTEXT, "Type charge deleted", { typeId: id });
    return successResponse({ success: true }, "Type charge supprimé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}
