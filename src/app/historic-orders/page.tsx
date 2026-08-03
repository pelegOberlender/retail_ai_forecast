import { getFilterOptions } from "@/lib/historicOrders";
import HistoricOrdersClient from "./HistoricOrdersClient";

export default async function HistoricOrdersPage() {
  const options = await getFilterOptions();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">Historic Orders</h1>
        <p className="mt-2 max-w-2xl text-foreground-soft">
          Every past order across quarters. Filter by season, category, or brand, and export
          the results to Excel.
        </p>
      </div>
      <HistoricOrdersClient options={options} />
    </div>
  );
}
