import { getFilterOptions } from "@/lib/historicOrders";
import HistoricOrdersClient from "./HistoricOrdersClient";

export default async function HistoricOrdersPage() {
  const options = await getFilterOptions();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl text-ink">Historic Orders</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Every past order across quarters &mdash; filter by season, category, or brand, and export
          the results to Excel.
        </p>
      </div>
      <HistoricOrdersClient options={options} />
    </div>
  );
}
