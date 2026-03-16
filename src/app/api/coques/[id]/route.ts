import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if any navire uses this coque
    const navires = await prisma.navire.count({
      where: { coqueId: id }
    });

    if (navires > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer : cette coque est utilisée par des navires." },
        { status: 400 }
      );
    }

    await prisma.coque.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
