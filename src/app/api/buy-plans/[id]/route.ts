import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.buyPlan.findUnique({
    where: { id },
    include: { items: { orderBy: [{ category: "asc" }, { styleName: "asc" }] } },
  });
  if (!plan) return Response.json({ error: "Buy plan not found." }, { status: 404 });
  return Response.json({ plan });
}

type PatchBody = {
  status?: "draft" | "locked";
  name?: string;
  items?: { id: string; finalQty: number }[];
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  const existing = await prisma.buyPlan.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Buy plan not found." }, { status: 404 });
  if (existing.status === "locked" && (body.items || body.status === undefined)) {
    if (body.status !== "draft") {
      return Response.json({ error: "This plan is locked. Unlock it before editing." }, { status: 409 });
    }
  }

  if (body.items && body.items.length > 0) {
    await Promise.all(
      body.items.map((item) =>
        prisma.buyPlanItem.update({
          where: { id: item.id },
          data: { finalQty: Math.max(0, Math.round(item.finalQty)) },
        })
      )
    );
  }

  const plan = await prisma.buyPlan.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.status
        ? { status: body.status, lockedAt: body.status === "locked" ? new Date() : null }
        : {}),
    },
    include: { items: { orderBy: [{ category: "asc" }, { styleName: "asc" }] } },
  });

  return Response.json({ plan });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.buyPlan.delete({ where: { id } });
  return Response.json({ ok: true });
}
