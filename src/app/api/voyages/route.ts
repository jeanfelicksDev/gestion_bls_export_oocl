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

    // Create Voyage linked to Navire
    const voyage = await prisma.voyage.create({
      data: {
        navireId: navire.id,
        numero: header.voyage,
        eta: header.eta ? new Date(header.eta) : null,
        etd: header.etd ? new Date(header.etd) : null,
        bls: {
          create: bls.map((bl: any) => ({
            booking: String(bl.booking),
            pod: bl.pod,
            shipper: bl.shipper,
            statut: bl.statut,
            typeConnaissement: bl.typeConnaissement,
            tender: String(bl.tender || ""),
            freighting: String(bl.freighting || ""),
            valeurFret: String(bl.valeurFret || ""),
            montantFret: String(bl.montantFret || ""),
            deviseFret: String(bl.deviseFret || "EUR"),
          })),
        },
      },
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
    });

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
    return NextResponse.json(voyages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
