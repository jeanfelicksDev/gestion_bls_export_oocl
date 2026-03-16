import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const coques = await prisma.coque.findMany({
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(coques);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nom } = await req.json();
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const coque = await prisma.coque.upsert({
      where: { nom },
      update: {},
      create: { nom },
    });
    return NextResponse.json(coque);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
