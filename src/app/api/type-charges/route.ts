import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const types = await prisma.typeCharge.findMany({
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(types);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nom } = await req.json();
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const typeCharge = await prisma.typeCharge.upsert({
      where: { nom: nom.trim().toUpperCase() },
      update: {},
      create: { nom: nom.trim().toUpperCase() },
    });
    return NextResponse.json(typeCharge);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
