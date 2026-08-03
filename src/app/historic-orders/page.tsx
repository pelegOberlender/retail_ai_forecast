import { getFilterOptions } from "@/lib/historicOrders";
import HistoricOrdersClient from "./HistoricOrdersClient";

export default async function HistoricOrdersPage() {
  const options = await getFilterOptions();

  return (
    <div className="page-frame">
      <div className="mb-10 border-b border-hairline pb-8">
        <h1 className="page-heading text-foreground">Historic orders</h1>
        <p className="page-deck">
          Every past order across quarters. Filter by season, category, or brand, and export
          the results to Excel.
        </p>
      </div>
      <HistoricOrdersClient options={options} />
    </div>
  );
}
