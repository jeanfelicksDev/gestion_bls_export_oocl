import { put } from "@vercel/blob";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators } from "@/lib/validation";

const CONTEXT = "API_BLS_UPLOAD";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  const blId = searchParams.get("blId");
  const type = searchParams.get("type"); // ORG, NNG, SWB, SCANNE

  if (!filename || !blId || !type) {
    return NextResponse.json({ error: "Paramètres manquants (filename, blId, type)" }, { status: 400 });
  }

  if (!validators.isValidId(blId)) {
    return NextResponse.json({ error: "ID de BL invalide" }, { status: 400 });
  }

  try {
    logger.debug(CONTEXT, "POST upload document", { filename, blId, type });
    const fileBlob = await req.blob();
    const blob = await put(filename, fileBlob, {
      access: "public",
      addRandomSuffix: true,
    });

    const updateData: Prisma.BLUpdateInput = {};
    if (type === "ORG") {
      updateData.urlORG = blob.url;
      updateData.isORG = true;
    } else if (type === "NNG") {
      updateData.urlNNG = blob.url;
      updateData.isNNG = true;
    } else if (type === "SWB") {
      updateData.urlSWB = blob.url;
      updateData.isSWB = true;
    } else if (type === "SCANNE") {
      updateData.urlScanne = blob.url;
      updateData.isScanne = true;
    } else {
      return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
    }

    await prisma.bL.update({
      where: { id: blId },
      data: updateData,
    });

    logger.info(CONTEXT, "Document uploaded and BL updated successfully", { blId, type });
    return successResponse(blob, "Fichier téléversé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "POST upload error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const blId = searchParams.get("blId");
  const type = searchParams.get("type");
  const url = searchParams.get("url");

  if (!blId || !type || !url) {
    return NextResponse.json({ error: "Paramètres manquants (blId, type, url)" }, { status: 400 });
  }

  if (!validators.isValidId(blId)) {
    return NextResponse.json({ error: "ID de BL invalide" }, { status: 400 });
  }

  try {
    logger.debug(CONTEXT, "DELETE upload document", { blId, type, url });
    const { del } = await import("@vercel/blob");
    
    // 1. Supprimer du stockage Vercel
    await del(url);

    // 2. Mettre à jour la base de données
    const updateData: Prisma.BLUpdateInput = {};
    if (type === "ORG") {
      updateData.urlORG = null;
      updateData.isORG = false;
    } else if (type === "NNG") {
      updateData.urlNNG = null;
      updateData.isNNG = false;
    } else if (type === "SWB") {
      updateData.urlSWB = null;
      updateData.isSWB = false;
    } else if (type === "SCANNE") {
      updateData.urlScanne = null;
      updateData.isScanne = false;
    } else {
      return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
    }

    await prisma.bL.update({
      where: { id: blId },
      data: updateData,
    });

    logger.info(CONTEXT, "Document deleted and BL updated successfully", { blId, type });
    return successResponse({ success: true }, "Fichier supprimé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE upload error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

