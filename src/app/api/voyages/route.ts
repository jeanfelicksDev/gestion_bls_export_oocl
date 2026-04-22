import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { header, bls, manual } = body;

    // Manual creation
    if (manual) {
      const voyage = await prisma.voyage.create({
        data: {
          navireId: body.navireId,
          numero: body.numero,
          eta: body.eta ? new Date(body.eta) : null,
          etd: body.etd ? new Date(body.etd) : null,
          tauxDollar: body.tauxDollar ? String(body.tauxDollar) : null,
        },
      });
      return NextResponse.json(voyage);
    }

    // Excel creation (header structure: { navire, voyage, eta, etd })
    if (!header || !bls) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Upsert Navire first
    const navire = await prisma.navire.upsert({
      where: { nom: header.navire },
      update: {},
      create: { nom: header.navire },
    });

    // Create Voyage linked to Navire (without bls initially)
    const voyage = await prisma.voyage.create({
      data: {
        navireId: navire.id,
        numero: header.voyage,
        eta: header.eta ? new Date(header.eta) : null,
        etd: header.etd ? new Date(header.etd) : null,
        tauxDollar: header.tauxDollar ? String(header.tauxDollar) : "600 XOF",
      },
      include: {
        navire: { include: { coque: true } },
      },
    });

    // Upsert each BL to handle existing orphans (cache de notes)
    for (const bl of bls) {
      const bookingStr = String(bl.booking).trim().toUpperCase();
      if (!bookingStr) continue;

      const blData: any = {
        voyageId: voyage.id,
        pod: bl.pod,
        shipper: bl.shipper,
        statutFret: bl.statutFret,
        typeConnaissement: bl.typeConnaissement,
        montantFret: String(bl.montantFret || ""),
        statutCorrection: bl.statutCorrection,
        numTimbre: bl.numTimbre ? String(bl.numTimbre) : undefined,
        dateRetrait: bl.dateRetrait ? new Date(bl.dateRetrait) : undefined,
        commentaire: (bl.commentaire && String(bl.commentaire).trim() !== "") ? String(bl.commentaire).trim() : undefined,
        deviseFret: String(bl.deviseFret || "EUR"),
      };

      await prisma.bL.upsert({
        where: { booking: bookingStr },
        update: blData,
        create: {
          booking: bookingStr,
          ...blData,
        },
      });
    }

    // Refresh voyage data with bls
    const updatedVoyage = await prisma.voyage.findUnique({
      where: { id: voyage.id },
      include: {
        bls: {
          include: { autresCharges: true }
        },
        navire: { include: { coque: true } },
      },
    });

    return NextResponse.json(updatedVoyage);

    return NextResponse.json(voyage);
  } catch (error: any) {
    console.error("Voyage creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const voyages = await prisma.voyage.findMany({
      include: {
        bls: {
          include: {
            autresCharges: true
          }
        },
        navire: {
          include: { coque: true }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const orphanBls = await prisma.bL.findMany({
      where: { voyageId: null },
      include: { autresCharges: true }
    });

    if (orphanBls.length > 0) {
      const virtualVoyage = {
        id: "pre-vessel",
        numero: "SANS NAVIRE",
        navire: { nom: "DOSSIERS PRÉ-SAISIS" },
        bls: orphanBls,
        etd: null,
        eta: null,
        etdConfirmed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // @ts-ignore
      voyages.unshift(virtualVoyage);
    }

    return NextResponse.json(voyages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
