import { getCatalogImportView } from "@/lib/catalogImports";
import { NewBuyPlanWorkflow } from "./NewBuyPlanWorkflow";

export default async function NewBuyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ catalogImportId?: string }>;
}) {
  const { catalogImportId } = await searchParams;
  const initialCatalogImport = catalogImportId
    ? await getCatalogImportView(catalogImportId)
    : null;

  return (
    <div className="page-frame max-w-screen-2xl">
      <header className="border-b border-hairline pb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
          Quarterly planning workflow
        </p>
        <h1 className="page-heading mt-3">Create a buy plan</h1>
        <p className="page-deck">
          Validate the supplier catalog first, confirm the commercial brief, then generate a review-ready plan.
        </p>
      </header>

      <NewBuyPlanWorkflow initialCatalogImport={initialCatalogImport} />
    </div>
  );
}
