import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const navires = await prisma.navire.findMany({
      orderBy: { nom: "asc" },
      include: { coque: true },
    });
    return NextResponse.json(navires);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nom, coqueId } = await req.json();
    if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const navire = await prisma.navire.upsert({
      where: { nom },
      update: { coqueId: coqueId || undefined },
      create: { nom, coqueId: coqueId || undefined },
    });
    return NextResponse.json(navire);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
