import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const blId = searchParams.get("blId");
  const type = searchParams.get("type"); // ORG, NNG, SWB

  if (!filename || !blId || !type) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  try {
    const fileBlob = await request.blob();
    const blob = await put(filename, fileBlob, {
      access: "public",
      addRandomSuffix: true,
    });

    // Mettre à jour la base de données avec la nouvelle URL
    const updateData: any = {};
    if (type === "ORG") updateData.urlORG = blob.url;
    if (type === "NNG") updateData.urlNNG = blob.url;
    if (type === "SWB") updateData.urlSWB = blob.url;
    if (type === "SCANNE") updateData.urlScanne = blob.url;
    
    // Activer le flag correspondant
    const flagField = type === "SCANNE" ? "isScanne" : `is${type}`;
    updateData[flagField] = true;

    await prisma.bL.update({
      where: { id: blId },
      data: updateData,
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error("DEBUG: Upload API Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Erreur lors de l'upload" }, { status: 500 });
  }
}
