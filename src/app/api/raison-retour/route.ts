import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const raisons = await prisma.raisonRetour.findMany({
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(raisons);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nom } = await req.json();
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const raison = await prisma.raisonRetour.upsert({
      where: { nom: nom.trim() },
      update: {},
      create: { nom: nom.trim() },
    });
    return NextResponse.json(raison);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
