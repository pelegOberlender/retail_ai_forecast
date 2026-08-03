"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Table2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui";
import type { CatalogImportView, CatalogIssueView } from "@/lib/catalogContracts";

const STEPS = ["Upload", "Validate", "Plan details", "Review", "Generate"] as const;
const FIELD_OPTIONS = [
  ["", "Not mapped"],
  ["styleName", "Item name · required"],
  ["sku", "SKU / style code"],
  ["category", "Category"],
  ["color", "Color"],
  ["brand", "Brand"],
  ["unitCost", "Wholesale cost"],
  ["unitPrice", "Retail price"],
  ["imageUrl", "Image URL"],
  ["description", "Description"],
] as const;

function upcomingQuarters(count: number): string[] {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;
  return Array.from({ length: count }, () => {
    quarter += 1;
    if (quarter > 4) {
      quarter = 1;
      year += 1;
    }
    return `${year}-Q${quarter}`;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function NewBuyPlanWorkflow({
  initialCatalogImport,
}: {
  initialCatalogImport: CatalogImportView | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const quarters = useMemo(() => upcomingQuarters(5), []);

  const [step, setStep] = useState(initialCatalogImport?.status === "ready" ? 1 : 0);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catalogImport, setCatalogImport] = useState<CatalogImportView | null>(initialCatalogImport);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingRequired, setMappingRequired] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [name, setName] = useState("");
  const [quarter, setQuarter] = useState(quarters[0]);
  const [brandFocus, setBrandFocus] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setCatalogImport(null);
    setHeaders([]);
    setMapping({});
    setMappingRequired(false);
    setError(null);
  }

  function resetUpload() {
    selectFile(null);
    setStep(0);
    if (inputRef.current) inputRef.current.value = "";
    router.replace("/buy-plans/new", { scroll: false });
  }

  function updateMapping(header: string, field: string) {
    setMapping((current) => {
      const next = { ...current };
      for (const [mappedHeader, mappedField] of Object.entries(next)) {
        if (mappedField === field && mappedHeader !== header) delete next[mappedHeader];
      }
      if (field) next[header] = field;
      else delete next[header];
      return next;
    });
  }

  async function validateCatalog() {
    if (!file) {
      setError("Choose a CSV or Excel catalog first.");
      return;
    }
    if (mappingRequired && !Object.values(mapping).includes("styleName")) {
      setError("Map one column to Item name before validating again.");
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("catalog", file);
    if (Object.keys(mapping).length > 0) formData.append("mapping", JSON.stringify(mapping));

    try {
      const response = await fetch("/api/catalog-imports", { method: "POST", body: formData });
      const data = (await response.json()) as {
        catalogImport?: CatalogImportView;
        error?: string;
        headers?: string[];
        mapping?: Record<string, string>;
        mappingRequired?: boolean;
      };
      if (!response.ok || !data.catalogImport) {
        setError(data.error ?? "The catalog could not be validated.");
        setHeaders(data.headers ?? []);
        setMapping(data.mapping ?? {});
        setMappingRequired(Boolean(data.mappingRequired));
        return;
      }

      setCatalogImport(data.catalogImport);
      setMapping(data.catalogImport.mapping);
      setMappingRequired(false);
      setStep(1);
      router.replace(`/buy-plans/new?catalogImportId=${data.catalogImport.id}`, { scroll: false });
    } catch {
      setError("Could not reach the server. Your file has not been lost; try validation again.");
    } finally {
      setUploading(false);
    }
  }

  async function loadPreviewPage(page: number) {
    if (!catalogImport || page < 1 || page > catalogImport.pagination.totalPages) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/catalog-imports/${catalogImport.id}?page=${page}&pageSize=${catalogImport.pagination.pageSize}`
      );
      const data = (await response.json()) as { catalogImport?: CatalogImportView; error?: string };
      if (!response.ok || !data.catalogImport) {
        setError(data.error ?? "Could not load this preview page.");
        return;
      }
      setCatalogImport(data.catalogImport);
    } catch {
      setError("Could not load this preview page.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function continueToReview() {
    const budget = totalBudget ? Number(totalBudget) : undefined;
    if (budget != null && (!Number.isFinite(budget) || budget <= 0)) {
      setError("Enter a positive budget or leave the field empty.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function generatePlan() {
    if (!catalogImport) return;
    setStep(4);
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/buy-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogImportId: catalogImport.id,
          name: name.trim() || `${quarter} Buy Plan`,
          quarter,
          brandFocus: brandFocus.trim() || undefined,
          totalBudget: totalBudget ? Number(totalBudget) : undefined,
        }),
      });
      const data = (await response.json()) as { plan?: { id: string }; error?: string };
      if (!response.ok || !data.plan) {
        setError(data.error ?? "The plan could not be generated.");
        return;
      }
      router.push(`/buy-plans/${data.plan.id}`);
    } catch {
      setError("Could not reach the server. The validated catalog is still saved.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-7 grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
      <WorkflowSteps currentStep={step} onSelect={(nextStep) => nextStep < step && setStep(nextStep)} />

      <main className="min-w-0 border-y border-hairline bg-white">
        {step === 0 && (
          <UploadStep
            file={file}
            dragActive={dragActive}
            uploading={uploading}
            inputRef={inputRef}
            headers={headers}
            mapping={mapping}
            mappingRequired={mappingRequired}
            error={error}
            onDragActive={setDragActive}
            onFile={selectFile}
            onMapping={updateMapping}
            onValidate={validateCatalog}
          />
        )}

        {step === 1 && catalogImport && (
          <ValidationStep
            catalogImport={catalogImport}
            loading={previewLoading}
            error={error}
            onPage={loadPreviewPage}
            onReplace={resetUpload}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && catalogImport && (
          <PlanDetailsStep
            catalogImport={catalogImport}
            name={name}
            quarter={quarter}
            quarters={quarters}
            brandFocus={brandFocus}
            totalBudget={totalBudget}
            error={error}
            onName={setName}
            onQuarter={setQuarter}
            onBrandFocus={setBrandFocus}
            onTotalBudget={setTotalBudget}
            onBack={() => setStep(1)}
            onContinue={continueToReview}
          />
        )}

        {step === 3 && catalogImport && (
          <ReviewStep
            catalogImport={catalogImport}
            name={name.trim() || `${quarter} Buy Plan`}
            quarter={quarter}
            brandFocus={brandFocus}
            totalBudget={totalBudget}
            onBack={() => setStep(2)}
            onGenerate={generatePlan}
          />
        )}

        {step === 4 && catalogImport && (
          <GenerationStep
            generating={generating}
            error={error}
            itemCount={catalogImport.validRowCount}
            onBack={() => setStep(3)}
            onRetry={generatePlan}
          />
        )}
      </main>
    </div>
  );
}

function WorkflowSteps({ currentStep, onSelect }: { currentStep: number; onSelect: (step: number) => void }) {
  return (
    <nav aria-label="Buy plan progress" className="xl:sticky xl:top-24 xl:self-start">
      <ol className="grid grid-cols-5 border-y border-hairline bg-white xl:block xl:border-y-0 xl:bg-transparent">
        {STEPS.map((label, index) => {
          const complete = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={label} className="relative xl:pb-7 last:xl:pb-0">
              {index < STEPS.length - 1 && (
                <span className="absolute left-[15px] top-8 hidden h-[calc(100%-1rem)] w-px bg-hairline xl:block" />
              )}
              <button
                type="button"
                onClick={() => complete && onSelect(index)}
                disabled={!complete}
                aria-current={active ? "step" : undefined}
                className="focus-ring flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-center xl:min-h-0 xl:flex-row xl:justify-start xl:gap-3 xl:px-0 xl:text-left"
              >
                <span
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                    complete
                      ? "border-accent bg-accent text-white"
                      : active
                        ? "border-foreground bg-ink-band text-white"
                        : "border-hairline-strong bg-background text-foreground-soft"
                  }`}
                >
                  {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`hidden text-sm xl:block ${active ? "font-semibold text-foreground" : "text-foreground-soft"}`}>
                  {label}
                </span>
                <span className={`text-[9px] xl:hidden ${active ? "font-semibold text-foreground" : "text-foreground-soft"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="border-b border-hairline px-6 py-6 sm:px-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent-dark">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-soft">{description}</p>
    </header>
  );
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <div role="alert" className="flex gap-3 border border-tone-red/25 bg-tone-red/5 px-4 py-3 text-sm text-tone-red">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function UploadStep({
  file,
  dragActive,
  uploading,
  inputRef,
  headers,
  mapping,
  mappingRequired,
  error,
  onDragActive,
  onFile,
  onMapping,
  onValidate,
}: {
  file: File | null;
  dragActive: boolean;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  headers: string[];
  mapping: Record<string, string>;
  mappingRequired: boolean;
  error: string | null;
  onDragActive: (active: boolean) => void;
  onFile: (file: File | null) => void;
  onMapping: (header: string, field: string) => void;
  onValidate: () => void;
}) {
  return (
    <>
      <SectionHeader
        eyebrow="Step 1 of 5"
        title="Upload supplier catalog"
        description="The file is parsed on the server. Only a small validation preview is returned to this browser."
      />
      <div className="space-y-6 px-6 py-7 sm:px-8">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            onDragActive(true);
          }}
          onDragLeave={() => onDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            onDragActive(false);
            onFile(event.dataTransfer.files[0] ?? null);
          }}
          className={`focus-within:ring-2 focus-within:ring-accent flex min-h-56 cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors ${
            dragActive ? "border-accent bg-accent-soft/45" : "border-hairline-strong bg-background hover:border-accent"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          />
          <span className="grid h-11 w-11 place-items-center rounded-[4px] bg-accent-soft text-accent-dark">
            {file ? <FileSpreadsheet aria-hidden="true" className="h-5 w-5" /> : <UploadCloud aria-hidden="true" className="h-5 w-5" />}
          </span>
          {file ? (
            <>
              <p className="mt-5 max-w-full truncate text-sm font-semibold">{file.name}</p>
              <p className="mt-1 text-xs text-foreground-soft">{formatBytes(file.size)} · Click or drop another file to replace</p>
            </>
          ) : (
            <>
              <p className="mt-5 text-sm font-semibold">Drop a catalog here or choose a file</p>
              <p className="mt-1 text-xs text-foreground-soft">CSV, XLSX, or XLS · up to 25 MB</p>
            </>
          )}
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-soft">
          <span>Item name is required. Categories and prices can be reviewed after validation.</span>
          <a href="/sample-catalog.csv" download className="focus-ring font-medium text-accent-dark underline underline-offset-4">
            Download sample catalog
          </a>
        </div>

        {mappingRequired && headers.length > 0 && (
          <ColumnMapping headers={headers} mapping={mapping} onMapping={onMapping} />
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <div className="flex justify-end border-t border-hairline pt-5">
          <Button variant="dark" disabled={!file || uploading} onClick={onValidate} className="min-w-44">
            {uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="h-4 w-4" />}
            {uploading ? "Validating catalog…" : mappingRequired ? "Validate mapping" : "Validate catalog"}
          </Button>
        </div>
      </div>
    </>
  );
}

function ColumnMapping({
  headers,
  mapping,
  onMapping,
}: {
  headers: string[];
  mapping: Record<string, string>;
  onMapping: (header: string, field: string) => void;
}) {
  return (
    <section className="border border-tone-amber/35 bg-tone-amber/5">
      <div className="border-b border-tone-amber/20 px-5 py-4">
        <h3 className="text-sm font-semibold">Map the columns we could not recognize</h3>
        <p className="mt-1 text-xs leading-5 text-foreground-soft">Choose which supplier column contains each MODO field. Item name is required.</p>
      </div>
      <div className="grid gap-px bg-hairline sm:grid-cols-2">
        {headers.map((header) => (
          <label key={header} className="bg-white px-5 py-4">
            <span className="mb-2 block truncate text-xs font-medium text-foreground">{header}</span>
            <select
              value={mapping[header] ?? ""}
              onChange={(event) => onMapping(header, event.target.value)}
              className="field-control cursor-pointer text-sm"
            >
              {FIELD_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function ValidationStep({
  catalogImport,
  loading,
  error,
  onPage,
  onReplace,
  onContinue,
}: {
  catalogImport: CatalogImportView;
  loading: boolean;
  error: string | null;
  onPage: (page: number) => void;
  onReplace: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <SectionHeader
        eyebrow="Step 2 of 5"
        title="Catalog validation"
        description="Check the mapped fields, warnings, and product sample before using this catalog for recommendations."
      />
      <div className="space-y-7 px-6 py-7 sm:px-8">
        <div className="grid border-y border-hairline sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Rows received" value={catalogImport.rowCount.toLocaleString()} />
          <Metric label="Usable products" value={catalogImport.validRowCount.toLocaleString()} tone="green" />
          <Metric label="Rows with warnings" value={catalogImport.warningCount.toLocaleString()} tone={catalogImport.warningCount ? "amber" : undefined} />
          <Metric label="Rows skipped" value={catalogImport.errorCount.toLocaleString()} tone={catalogImport.errorCount ? "red" : undefined} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <CatalogPreview catalogImport={catalogImport} loading={loading} onPage={onPage} />
          <div className="space-y-5">
            <MappingSummary mapping={catalogImport.mapping} />
            <IssueSummary issues={catalogImport.issues} />
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-hairline pt-5 sm:flex-row">
          <Button variant="ghost" onClick={onReplace}><RefreshCw aria-hidden="true" className="h-4 w-4" />Replace file</Button>
          <Button variant="dark" onClick={onContinue}>Continue to plan details<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "red" }) {
  const color = tone === "green" ? "text-tone-green" : tone === "amber" ? "text-tone-amber" : tone === "red" ? "text-tone-red" : "text-foreground";
  return (
    <div className="border-b border-hairline px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground-soft">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] ${color}`}>{value}</p>
    </div>
  );
}

function CatalogPreview({ catalogImport, loading, onPage }: { catalogImport: CatalogImportView; loading: boolean; onPage: (page: number) => void }) {
  const { page, totalPages, totalItems } = catalogImport.pagination;
  return (
    <section className="min-w-0 border border-hairline">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Product preview</h3>
          <p className="mt-0.5 text-xs text-foreground-soft">Page {page} of {totalPages} · {totalItems.toLocaleString()} products</p>
        </div>
        {loading && <Loader2 aria-label="Loading preview" className="h-4 w-4 animate-spin text-accent-dark" />}
      </div>
      <div className="divide-y divide-hairline md:hidden">
        {catalogImport.preview.map((product) => (
          <article key={product.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{product.styleName}</p>
                <p className="mt-1 text-[11px] text-foreground-soft">{product.sku || "No SKU"} · {product.category || "Uncategorized"}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] ${product.validationStatus === "warning" ? "text-tone-amber" : "text-tone-green"}`}>
                {product.validationStatus === "warning" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {product.validationStatus === "warning" ? "Review" : "Ready"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-xs">
              <span className="text-foreground-soft">{product.color || product.brand || "No color"}</span>
              <span className="font-mono tabular-nums">{formatMoney(product.wholesalePrice)} / {formatMoney(product.retailPrice)}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-surface/55 text-[9px] uppercase tracking-[0.1em] text-foreground-soft">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 text-right font-semibold">Cost</th>
              <th className="px-4 py-3 text-right font-semibold">Retail</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className={loading ? "opacity-45" : undefined}>
            {catalogImport.preview.map((product) => (
              <tr key={product.id} className="border-t border-hairline first:border-t-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative grid h-9 w-8 shrink-0 place-items-center overflow-hidden bg-surface text-[9px] text-foreground-soft">
                      {product.imageUrl?.startsWith("/") ? (
                        <Image src={product.imageUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
                      ) : product.styleName.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <span className="block max-w-56 truncate font-medium text-foreground">{product.styleName}</span>
                      <span className="mt-0.5 block text-[10px] text-foreground-soft">{product.color || product.brand || "—"}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-foreground-soft">{product.sku || "—"}</td>
                <td className="px-4 py-3">{product.category || "Uncategorized"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(product.wholesalePrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(product.retailPrice)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 ${product.validationStatus === "warning" ? "text-tone-amber" : "text-tone-green"}`}>
                    {product.validationStatus === "warning" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {product.validationStatus === "warning" ? "Review" : "Ready"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
        <Button variant="ghost" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="min-h-9 px-3 py-1.5 text-xs">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />Previous
        </Button>
        <span className="text-[10px] tabular-nums text-foreground-soft">{Math.min((page - 1) * catalogImport.pagination.pageSize + 1, totalItems)}–{Math.min(page * catalogImport.pagination.pageSize, totalItems)} of {totalItems}</span>
        <Button variant="ghost" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)} className="min-h-9 px-3 py-1.5 text-xs">
          Next<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function MappingSummary({ mapping }: { mapping: Record<string, string> }) {
  return (
    <section className="border border-hairline">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <Table2 aria-hidden="true" className="h-4 w-4 text-accent-dark" />
        <h3 className="text-sm font-semibold">Column mapping</h3>
      </div>
      <dl className="divide-y divide-hairline px-4">
        {Object.entries(mapping).map(([source, target]) => (
          <div key={source} className="flex items-center justify-between gap-3 py-2.5 text-xs">
            <dt className="truncate text-foreground-soft">{source}</dt>
            <dd className="shrink-0 font-medium text-foreground">{target}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function IssueSummary({ issues }: { issues: CatalogIssueView[] }) {
  const visibleIssues = issues.slice(0, 6);
  return (
    <section className="border border-hairline">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <AlertTriangle aria-hidden="true" className="h-4 w-4 text-tone-amber" />
        <h3 className="text-sm font-semibold">Validation notes</h3>
      </div>
      {visibleIssues.length > 0 ? (
        <ul className="divide-y divide-hairline px-4">
          {visibleIssues.map((issue, index) => (
            <li key={`${issue.code}-${issue.row ?? index}`} className="py-3 text-xs leading-5 text-foreground-soft">{issue.message}</li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-5 text-xs text-foreground-soft">No validation notes. The mapped rows are ready.</p>
      )}
    </section>
  );
}

function PlanDetailsStep({
  catalogImport,
  name,
  quarter,
  quarters,
  brandFocus,
  totalBudget,
  error,
  onName,
  onQuarter,
  onBrandFocus,
  onTotalBudget,
  onBack,
  onContinue,
}: {
  catalogImport: CatalogImportView;
  name: string;
  quarter: string;
  quarters: string[];
  brandFocus: string;
  totalBudget: string;
  error: string | null;
  onName: (value: string) => void;
  onQuarter: (value: string) => void;
  onBrandFocus: (value: string) => void;
  onTotalBudget: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <SectionHeader eyebrow="Step 3 of 5" title="Set the commercial brief" description="These constraints shape the recommendation run. You can still edit final quantities in the workspace." />
      <div className="px-6 py-7 sm:px-8">
        <div className="mb-7 flex items-center gap-3 border border-hairline bg-surface/35 px-4 py-3 text-xs text-foreground-soft">
          <Database aria-hidden="true" className="h-4 w-4 text-accent-dark" />
          <span><strong className="font-semibold text-foreground">{catalogImport.validRowCount.toLocaleString()} products</strong> from {catalogImport.fileName}</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Plan name">
            <input value={name} onChange={(event) => onName(event.target.value)} placeholder={`${quarter} Buy Plan`} maxLength={120} className="field-control text-sm" />
          </Field>
          <Field label="Target quarter">
            <select value={quarter} onChange={(event) => onQuarter(event.target.value)} className="field-control cursor-pointer text-sm">
              {quarters.map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Brand focus · optional" hint="Used only when live trend research is connected later.">
            <input value={brandFocus} onChange={(event) => onBrandFocus(event.target.value)} placeholder="e.g. Modo Label" maxLength={120} className="field-control text-sm" />
          </Field>
          <Field label="Total budget · optional" hint="Recommendations are scaled down if projected spend exceeds this cap.">
            <input value={totalBudget} onChange={(event) => onTotalBudget(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 50000" inputMode="decimal" className="field-control text-sm" />
          </Field>
        </div>
        {error && <div className="mt-6"><ErrorMessage>{error}</ErrorMessage></div>}
        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-hairline pt-5 sm:flex-row">
          <Button variant="ghost" onClick={onBack}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to validation</Button>
          <Button variant="dark" onClick={onContinue}>Review plan setup<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-5 text-foreground-soft">{hint}</span>}
    </label>
  );
}

function ReviewStep({
  catalogImport,
  name,
  quarter,
  brandFocus,
  totalBudget,
  onBack,
  onGenerate,
}: {
  catalogImport: CatalogImportView;
  name: string;
  quarter: string;
  brandFocus: string;
  totalBudget: string;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <>
      <SectionHeader eyebrow="Step 4 of 5" title="Review before generation" description="MODO will use the validated products and available historical evidence. Missing AI evidence is omitted rather than invented." />
      <div className="space-y-7 px-6 py-7 sm:px-8">
        <dl className="grid border-y border-hairline sm:grid-cols-2">
          <ReviewValue label="Plan" value={name} />
          <ReviewValue label="Target quarter" value={quarter} />
          <ReviewValue label="Catalog" value={`${catalogImport.fileName} · ${catalogImport.validRowCount.toLocaleString()} products`} />
          <ReviewValue label="Budget cap" value={totalBudget ? formatMoney(Number(totalBudget)) : "No cap"} />
          <ReviewValue label="Target market" value={`${catalogImport.targetMarket} · Israel`} />
          <ReviewValue label="Brand focus" value={brandFocus || "Not specified"} />
        </dl>

        <section className="grid gap-px bg-hairline sm:grid-cols-3">
          <EvidenceItem icon={<Database className="h-4 w-4" />} title="Historical evidence" description="Matched when comparable orders exist." />
          <EvidenceItem icon={<ShieldCheck className="h-4 w-4" />} title="Budget guardrail" description="Applied only when a cap is provided." />
          <EvidenceItem icon={<Sparkles className="h-4 w-4" />} title="Trend evidence" description="Omitted until a live source is connected." />
        </section>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-hairline pt-5 sm:flex-row">
          <Button variant="ghost" onClick={onBack}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Edit details</Button>
          <Button variant="dark" onClick={onGenerate}><Sparkles aria-hidden="true" className="h-4 w-4" />Generate buy plan</Button>
        </div>
      </div>
    </>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-hairline px-5 py-4 odd:sm:border-r [&:nth-last-child(-n+2)]:sm:border-b-0">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground-soft">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EvidenceItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white px-5 py-5">
      <span className="text-accent-dark">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-foreground-soft">{description}</p>
    </div>
  );
}

function GenerationStep({ generating, error, itemCount, onBack, onRetry }: { generating: boolean; error: string | null; itemCount: number; onBack: () => void; onRetry: () => void }) {
  return (
    <>
      <SectionHeader eyebrow="Step 5 of 5" title={error ? "Generation needs attention" : "Building your buy plan"} description={error ? "The validated catalog remains saved, so you can retry without uploading it again." : `MODO is evaluating ${itemCount.toLocaleString()} products against the evidence currently available.`} />
      <div className="px-6 py-10 sm:px-8">
        {error ? (
          <div className="mx-auto max-w-xl space-y-5">
            <ErrorMessage>{error}</ErrorMessage>
            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <Button variant="ghost" onClick={onBack}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to review</Button>
              <Button variant="dark" onClick={onRetry}><RefreshCw aria-hidden="true" className="h-4 w-4" />Retry generation</Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-xl">
            <div className="flex items-center gap-4 border-b border-hairline pb-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent-dark">
                <Loader2 aria-hidden="true" className={`h-5 w-5 ${generating ? "animate-spin" : ""}`} />
              </span>
              <div>
                <p className="text-sm font-semibold">Recommendation job is running</p>
                <p className="mt-1 text-xs text-foreground-soft">You will be taken to the workspace when the plan is ready.</p>
              </div>
            </div>
            <ol className="mt-6 space-y-4 text-sm">
              <GenerationStatus complete label="Catalog validated and persisted" />
              <GenerationStatus active label="Matching historical evidence by category" />
              <GenerationStatus label="Applying quantity and budget rules" />
              <GenerationStatus label="Creating the editable workspace" />
            </ol>
          </div>
        )}
      </div>
    </>
  );
}

function GenerationStatus({ label, complete, active }: { label: string; complete?: boolean; active?: boolean }) {
  return (
    <li className={`flex items-center gap-3 ${complete || active ? "text-foreground" : "text-foreground-soft"}`}>
      <span className={`grid h-6 w-6 place-items-center rounded-full border ${complete ? "border-tone-green bg-tone-green text-white" : active ? "border-accent text-accent-dark" : "border-hairline-strong"}`}>
        {complete ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </span>
      {label}
    </li>
  );
}
