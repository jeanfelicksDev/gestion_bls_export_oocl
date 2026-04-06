import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.voyageId || !body.bls || !Array.isArray(body.bls)) {
      return NextResponse.json({ error: "VoyageId et un tableau de BLs sont requis" }, { status: 400 });
    }

    const voyageId = body.voyageId;
    const bls = body.bls;
    
    let successCount = 0;
    
    // We process sequentially to ensure reliable upserts on SQLite/Neon
    for (const item of bls) {
       if (!item.booking) continue;
       
       const bookingStr = String(item.booking).trim().toUpperCase();
       if (bookingStr.length < 3) continue;

       const data = {
         voyageId: voyageId,
         pod: item.pod ? String(item.pod).trim() : null,
         shipper: item.shipper ? String(item.shipper).trim() : null,
         valeurFret: item.valeurFret ? String(item.valeurFret).trim() : null,
         montantFret: item.montantFret ? String(item.montantFret).trim() : null,
         statutCorrection: item.statutCorrection ? String(item.statutCorrection).trim() : null,
         numTimbre: item.numTimbre ? String(item.numTimbre).trim() : null,
         dateRetrait: item.dateRetrait ? new Date(item.dateRetrait) : null,
         statut: item.dateRetrait ? "RETIRE" : "EN ATTENTE RETRAIT",
         commentaire: item.commentaire ? String(item.commentaire).trim() : null,
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
