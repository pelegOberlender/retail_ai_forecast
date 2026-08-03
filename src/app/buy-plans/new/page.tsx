"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";

function upcomingQuarters(count: number): string[] {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    quarter += 1;
    if (quarter > 4) {
      quarter = 1;
      year += 1;
    }
    out.push(`${year}-Q${quarter}`);
  }
  return out;
}

export default function NewBuyPlanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quarters = useMemo(() => upcomingQuarters(4), []);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [name, setName] = useState("");
  const [quarter, setQuarter] = useState(quarters[0]);
  const [brandFocus, setBrandFocus] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (files && files[0]) {
      setFile(files[0]);
      setError(null);
    }
  }

  async function handleSubmit() {
    if (!file) {
      setError("Upload a catalog file (CSV or Excel) first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("catalog", file);
    formData.append("name", name || `${quarter} Buy Plan`);
    formData.append("quarter", quarter);
    if (brandFocus) formData.append("brandFocus", brandFocus);
    if (totalBudget) formData.append("totalBudget", totalBudget);

    try {
      const res = await fetch("/api/buy-plans", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong generating the plan.");
        setSubmitting(false);
        return;
      }
      router.push(`/buy-plans/${data.plan.id}`);
    } catch {
      setError("Could not reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">Create a Buy Plan</h1>
        <p className="mx-auto mt-3 max-w-xl text-foreground-soft">
          Upload next quarter&apos;s catalog and we&apos;ll recommend order quantities based on
          historic sell-through and trend signal.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragActive ? "border-accent bg-accent/10" : "border-hairline hover:border-accent/60"
          }`}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="text-foreground-soft" aria-hidden>
            <path
              d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3M12 3v12m0-12l-4 4m4-4l4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {file ? (
            <p className="font-medium text-foreground">{file.name}</p>
          ) : (
            <>
              <p className="font-medium text-foreground">Click to upload a catalog or drag &amp; drop</p>
              <p className="text-xs text-foreground-soft">Supports CSV, XLSX. Item name is the only required column.</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <p className="mt-3 text-center text-xs text-foreground-soft">
          No catalog handy?{" "}
          <a href="/sample-catalog.csv" download className="text-accent underline hover:text-accent-dark">
            Download a sample catalog
          </a>{" "}
          to try it out.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label="Plan name (optional)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${quarter} Buy Plan`}
              className="w-full rounded-full border border-hairline bg-surface-hover px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </Field>
          <Field label="Target quarter">
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="w-full rounded-full border border-hairline bg-surface-hover px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            >
              {quarters.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand focus for trend read (optional)">
            <input
              value={brandFocus}
              onChange={(e) => setBrandFocus(e.target.value)}
              placeholder="e.g. Modo Label"
              className="w-full rounded-full border border-hairline bg-surface-hover px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </Field>
          <Field label="Total budget (optional)">
            <input
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="e.g. 50000"
              inputMode="decimal"
              className="w-full rounded-full border border-hairline bg-surface-hover px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-tone-red">{error}</p>}

        <div className="mt-8 flex justify-center">
          <Button variant="dark" className="px-8 py-3 text-[15px]" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Generating buy plan…" : "Generate Buy Plan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="tracking-label mb-1.5 block text-xs text-foreground-soft">{label}</label>
      {children}
    </div>
  );
}
