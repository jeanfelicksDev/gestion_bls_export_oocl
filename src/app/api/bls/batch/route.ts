import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.bls || !Array.isArray(body.bls)) {
      return NextResponse.json({ error: "Un tableau de BLs est requis" }, { status: 400 });
    }

    const voyageId = body.voyageId || null;
    const bls = body.bls;
    
    let successCount = 0;
    
    // We process sequentially to ensure reliable upserts on SQLite/Neon
    for (const item of bls) {
       if (!item.booking) continue;
       
       const bookingStr = String(item.booking).trim().toUpperCase();
       if (bookingStr.length < 3) continue;

       const data: any = {
         voyageId: voyageId,
         pod: item.pod ? String(item.pod).trim() : undefined,
         shipper: item.shipper ? String(item.shipper).trim() : undefined,
         valeurFret: item.valeurFret ? String(item.valeurFret).trim() : undefined,
         montantFret: item.montantFret ? String(item.montantFret).trim() : undefined,
         statutCorrection: item.statutCorrection ? String(item.statutCorrection).trim() : undefined,
         statutFret: item.statutFret ? String(item.statutFret).trim() : undefined,
         numTimbre: item.numTimbre ? String(item.numTimbre).trim() : undefined,
         dateRetrait: item.dateRetrait ? new Date(item.dateRetrait) : undefined,
         statut: item.dateRetrait ? "RETIRE" : undefined,
         commentaire: (item.commentaire && String(item.commentaire).trim() !== "") ? String(item.commentaire).trim() : undefined,
       };

       await prisma.bL.upsert({
         where: { booking: bookingStr },
         update: data,
         create: {
           booking: bookingStr,
           ...data
         }
       });
       
       successCount++;
    }

    return NextResponse.json({ success: true, count: successCount });
    
  } catch (error: any) {
    console.error("API Error (BL Batch Creation):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
