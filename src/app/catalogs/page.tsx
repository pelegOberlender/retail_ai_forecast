import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CatalogsPage() {
  const [imports, totals] = await Promise.all([
    prisma.catalogImport.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 20,
      select: {
        id: true,
        fileName: true,
        status: true,
        uploadedAt: true,
        validRowCount: true,
        warningCount: true,
        errorCount: true,
        targetMarket: true,
      },
    }),
    prisma.catalogImport.aggregate({
      _count: { _all: true },
      _sum: { validRowCount: true, warningCount: true },
    }),
  ]);

  return (
    <div className="page-frame">
      <header className="flex flex-col gap-5 border-b border-hairline pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-dark">Product foundation</p>
          <h1 className="page-heading mt-3">Catalogs</h1>
          <p className="page-deck">Validated supplier files, mapped products, and the source data behind each buy plan.</p>
        </div>
        <Link href="/buy-plans/new" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-ink-band px-5 text-sm font-medium text-white hover:bg-accent-dark">
          <UploadCloud aria-hidden="true" className="h-4 w-4" />Import catalog
        </Link>
      </header>

      <section className="mt-7 grid border-y border-hairline bg-white sm:grid-cols-3">
        <CatalogMetric label="Imports" value={totals._count._all.toLocaleString()} icon={<FileSpreadsheet className="h-4 w-4" />} />
        <CatalogMetric label="Usable products" value={(totals._sum.validRowCount ?? 0).toLocaleString()} icon={<Database className="h-4 w-4" />} />
        <CatalogMetric label="Rows to review" value={(totals._sum.warningCount ?? 0).toLocaleString()} icon={<AlertTriangle className="h-4 w-4" />} />
      </section>

      <section className="mt-7 border-y border-hairline bg-white">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">Recent imports</h2>
            <p className="mt-1 text-xs text-foreground-soft">The 20 most recent supplier files.</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.1em] text-foreground-soft">Israel · IL</span>
        </div>

        {imports.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-foreground-soft"><FileSpreadsheet className="h-5 w-5" /></span>
            <h2 className="mt-4 text-sm font-semibold">No catalogs imported yet</h2>
            <p className="mt-2 max-w-md text-sm text-foreground-soft">Upload a supplier CSV or Excel file to validate its products and create a buy plan.</p>
            <Link href="/buy-plans/new" className="focus-ring mt-5 text-sm font-medium text-accent-dark underline underline-offset-4">Start the first import</Link>
          </div>
        ) : (
          <>
          <div className="divide-y divide-hairline md:hidden">
            {imports.map((catalogImport) => (
              <article key={catalogImport.id} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{catalogImport.fileName}</p>
                    <p className="mt-1 text-[11px] text-foreground-soft">{dateFormatter.format(catalogImport.uploadedAt)}</p>
                  </div>
                  <ImportStatus status={catalogImport.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 border-y border-hairline py-3 text-xs">
                  <div><span className="block text-[9px] uppercase tracking-[0.1em] text-foreground-soft">Products</span><span className="mt-1 block font-mono tabular-nums">{catalogImport.validRowCount.toLocaleString()}</span></div>
                  <div><span className="block text-[9px] uppercase tracking-[0.1em] text-foreground-soft">Warnings</span><span className={`mt-1 block font-mono tabular-nums ${catalogImport.warningCount ? "text-tone-amber" : ""}`}>{catalogImport.warningCount.toLocaleString()}</span></div>
                </div>
                {catalogImport.status === "ready" && (
                  <Link href={`/buy-plans/new?catalogImportId=${catalogImport.id}`} className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-accent-dark">
                    Use catalog<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface/55 text-[9px] uppercase tracking-[0.1em] text-foreground-soft">
                <tr>
                  <th className="px-6 py-3 font-semibold">File</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Products</th>
                  <th className="px-4 py-3 text-right font-semibold">Warnings</th>
                  <th className="px-4 py-3 font-semibold">Imported</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((catalogImport) => (
                  <tr key={catalogImport.id} className="border-t border-hairline first:border-t-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-accent-soft text-accent-dark"><FileSpreadsheet className="h-4 w-4" /></span>
                        <span>
                          <span className="block max-w-72 truncate font-medium text-foreground">{catalogImport.fileName}</span>
                          <span className="mt-0.5 block text-[10px] text-foreground-soft">{catalogImport.targetMarket} market</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><ImportStatus status={catalogImport.status} /></td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums">{catalogImport.validRowCount.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-right font-mono tabular-nums ${catalogImport.warningCount ? "text-tone-amber" : "text-foreground-soft"}`}>{catalogImport.warningCount.toLocaleString()}</td>
                    <td className="px-4 py-4 text-xs text-foreground-soft">{dateFormatter.format(catalogImport.uploadedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      {catalogImport.status === "ready" ? (
                        <Link href={`/buy-plans/new?catalogImportId=${catalogImport.id}`} className="focus-ring inline-flex min-h-10 items-center gap-2 text-xs font-medium text-accent-dark hover:text-foreground">
                          Use catalog<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-foreground-soft">{catalogImport.errorCount ? "Upload again" : "Processing"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}

function CatalogMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border-b border-hairline px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-foreground-soft">
        <span className="text-accent-dark">{icon}</span>{label}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function ImportStatus({ status }: { status: "uploaded" | "validating" | "ready" | "failed" }) {
  const config = status === "ready"
    ? { label: "Ready", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "text-tone-green" }
    : status === "failed"
      ? { label: "Failed", icon: <AlertTriangle className="h-3.5 w-3.5" />, className: "text-tone-red" }
      : { label: status === "validating" ? "Validating" : "Uploaded", icon: <Clock3 className="h-3.5 w-3.5" />, className: "text-accent-dark" };
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.className}`}>{config.icon}{config.label}</span>;
}
