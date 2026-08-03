import { CheckCircle2, CircleDashed, KeyRound, MapPin } from "lucide-react";

const integrations = [
  { name: "Supabase database", state: "Awaiting local environment configuration" },
  { name: "Supabase authentication", state: "Awaiting local environment configuration" },
  { name: "Anthropic trend research", state: "Not connected" },
  { name: "Voyage embeddings", state: "Not connected" },
];

export default function SettingsPage() {
  return (
    <div className="page-frame">
      <header className="border-b border-hairline pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-dark">Workspace configuration</p>
        <h1 className="page-heading mt-3">Settings</h1>
        <p className="page-deck">Review the target market, recommendation defaults, and external service readiness.</p>
      </header>

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="border-t border-hairline bg-white px-6 py-7">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] bg-accent-soft text-accent-dark"><MapPin aria-hidden="true" className="h-5 w-5" /></span>
            <div><p className="text-xs uppercase tracking-[0.1em] text-foreground-soft">Default target market</p><h2 className="mt-2 text-xl font-semibold">Israel · IL</h2><p className="mt-2 text-sm leading-6 text-foreground-soft">All new catalog imports, trend reports, and buy plans default to the Israeli market.</p></div>
          </div>
        </section>

        <section className="border-t border-hairline bg-white">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-5"><KeyRound aria-hidden="true" className="h-4 w-4 text-accent-dark" /><h2 className="text-sm font-semibold">Integration readiness</h2></div>
          <div className="divide-y divide-hairline">
            {integrations.map((integration) => (
              <div key={integration.name} className="flex items-center justify-between gap-5 px-6 py-4">
                <div><p className="text-sm font-medium">{integration.name}</p><p className="mt-1 text-xs text-foreground-soft">{integration.state}</p></div>
                <span className="inline-flex items-center gap-2 text-xs text-foreground-soft"><CircleDashed aria-hidden="true" className="h-4 w-4" />Pending</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 bg-surface/45 px-6 py-4 text-xs leading-5 text-foreground-soft"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-tone-green" /><p>No secret values are displayed or stored in the browser. Configuration belongs in a local environment file or the deployment platform.</p></div>
        </section>
      </div>
    </div>
  );
}
