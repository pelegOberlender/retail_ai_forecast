import Link from "next/link";
import { Archive, ArrowRight, CheckCircle2, FileSpreadsheet } from "lucide-react";

export default function CatalogsPage() {
  return (
    <div className="page-frame">
      <header className="border-b border-hairline pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-dark">Product foundation</p>
        <h1 className="page-heading mt-3">Catalogs</h1>
        <p className="page-deck">Import supplier files, validate product data, and prepare every style for recommendation analysis.</p>
      </header>

      <section className="mt-8 grid border-y border-hairline bg-white lg:grid-cols-[1fr_320px]">
        <div className="px-6 py-10 sm:px-8">
          <span className="grid h-11 w-11 place-items-center rounded-[4px] bg-accent-soft text-accent-dark"><Archive aria-hidden="true" className="h-5 w-5" /></span>
          <h2 className="mt-6 text-xl font-semibold tracking-[-0.035em]">Catalog ingestion is ready for the next milestone</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-soft">The database now has durable records for imports, products, validation issues, and analysis status. Upload and column-mapping screens will be connected in Milestone 2.</p>
          <Link href="/buy-plans/new" className="focus-ring mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent-dark hover:text-foreground">View the current import flow <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        <div className="border-t border-hairline bg-surface/45 px-6 py-8 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold">Foundation status</h2>
          <ul className="mt-5 space-y-4 text-sm text-foreground-soft">
            <li className="flex gap-3"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-tone-green" /><span>PostgreSQL catalog schema defined</span></li>
            <li className="flex gap-3"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-tone-green" /><span>Validation and job statuses defined</span></li>
            <li className="flex gap-3"><FileSpreadsheet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" /><span>Excel parsing begins in Milestone 2</span></li>
          </ul>
        </div>
      </section>
    </div>
  );
}
