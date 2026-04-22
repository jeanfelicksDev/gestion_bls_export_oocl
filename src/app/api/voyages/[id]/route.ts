import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const voyage = await prisma.voyage.update({
      where: { id },
      data: {
        etdConfirmed: body.etdConfirmed ?? undefined,
        etd: body.etd ? new Date(body.etd) : undefined,
        eta: body.eta ? new Date(body.eta) : undefined,
        tauxDollar: body.tauxDollar !== undefined ? String(body.tauxDollar) : undefined,
      },
    });

    return NextResponse.json(voyage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.voyage.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
