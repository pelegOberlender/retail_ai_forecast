import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BuyPlanEditor from "./BuyPlanEditor";

export default async function BuyPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.buyPlan.findUnique({
    where: { id },
    include: { items: { orderBy: [{ category: "asc" }, { styleName: "asc" }] } },
  });

  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      <BuyPlanEditor initialPlan={JSON.parse(JSON.stringify(plan))} />
    </div>
  );
}
